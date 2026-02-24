import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { users, worksheets, subscriptions, generations } from '../../db/schema.js'
import { eq, sql, and, gt, lt } from 'drizzle-orm'
import { getAIProvider } from '../../api/_lib/ai-provider.js'
import { buildPdf, type PdfTemplateId } from '../../api/_lib/pdf/index.js'
import { withAuth, optionalAuth } from '../middleware/auth.js'
import { checkGenerateRateLimit, checkDailyGenerationLimit, checkRateLimit, checkDailyRegenLimit } from '../middleware/rate-limit.js'
import { trackGeneration, sendInstantFailureAlert } from '../../api/_lib/alerts/generation-alerts.js'
import type { AuthenticatedRequest } from '../types.js'
import { withAIContext } from '../../api/_lib/ai-usage.js'
import type { GeneratePayload, Worksheet } from '../../shared/types.js'
import { GenerateSchema, TaskTypeIdSchema, DifficultyLevelSchema, WorksheetSchema } from '../../shared/worksheet.js'
import { getUserPlanConfig } from '../../shared/plans.js'
import { calculateGenerationCost } from '../../api/_lib/generation/config/worksheet-formats.js'
import { generationLimiter } from '../../api/_lib/generation/concurrency-limiter.js'

const router = Router()

type SSEEvent =
  | { type: 'progress'; percent: number }
  | { type: 'result'; data: { worksheet: Worksheet } }
  | { type: 'error'; code: string; message: string }

type Input = z.infer<typeof GenerateSchema>

// ==================== POST /api/generate ====================
router.post('/', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  const parse = GenerateSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Проверьте введённые данные.',
    })
  }

  const input: Input = parse.data
  const userId = req.user.id

  // Calculate generation cost based on format + variant
  const cost = calculateGenerationCost(
    input.format ?? 'test_and_open',
    input.variantIndex ?? 0
  )

  // Atomically decrement generationsLeft -- prevents race condition.
  // If generationsLeft < cost, no rows are updated and the user is rejected.
  const [decremented] = await db
    .update(users)
    .set({
      generationsLeft: sql`${users.generationsLeft} - ${cost}`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(users.id, userId),
      sql`${users.generationsLeft} >= ${cost}`
    ))
    .returning({ generationsLeft: users.generationsLeft })

  if (!decremented) {
    return res.status(403).json({
      status: 'error',
      code: 'LIMIT_EXCEEDED',
      message: 'Лимит генераций исчерпан. Приобретите дополнительные генерации.',
    })
  }

  // Load subscription + plan config
  const [subscription] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  const planConfig = getUserPlanConfig(subscription?.plan, subscription?.status, subscription?.currentPeriodEnd)
  const isPaidUser = planConfig.paidModel

  if (isPaidUser) {
    const dailyCheck = await checkDailyGenerationLimit(userId, 20)
    if (!dailyCheck.allowed) {
      // Rollback the atomic decrement since we're rejecting the request
      await db
        .update(users)
        .set({
          generationsLeft: sql`${users.generationsLeft} + ${cost}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))

      return res.status(429).json({
        status: 'error',
        code: 'DAILY_LIMIT_EXCEEDED',
        message: `Суточный лимит генераций исчерпан (${dailyCheck.limit}/день). Лимит обновится после полуночи по МСК.`,
      })
    }
  }

  // Rate limiting (per-hour burst protection)
  const rateLimitResult = await checkGenerateRateLimit(req, userId)
  if (!rateLimitResult.success) {
    // Rollback the atomic decrement since we're rejecting the request
    await db
      .update(users)
      .set({
        generationsLeft: sql`${users.generationsLeft} + ${cost}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    return res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Слишком много запросов. Попробуйте через ${Math.ceil(retryAfter / 60)} мин.`,
      retryAfter,
    })
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // SSE keepalive ping — prevents nginx/Cloudflare from killing idle connections (60-75s timeout)
  const keepalive = setInterval(() => {
    if (!clientDisconnected) res.write(': ping\n\n')
  }, 15_000)

  // Client disconnect detection — skip expensive work (PDF, DB save) if client left
  let clientDisconnected = false
  req.on('close', () => {
    clientDisconnected = true
    clearInterval(keepalive)
  })

  const sendEvent = (data: SSEEvent) => {
    if (clientDisconnected) return
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Track generation lifecycle: insert 'processing' record
  let genRecord: { id: string } | null = null
  try {
    const [inserted] = await db.insert(generations).values({
      userId,
      status: 'processing',
      subject: input.subject,
      grade: input.grade,
      topic: input.topic,
      startedAt: new Date(),
    }).returning({ id: generations.id })
    genRecord = inserted || null
  } catch (e) {
    console.error('[API] Failed to insert generation record:', e)
  }

  try {
    const ai = getAIProvider()

    // Determine if user has paid access (subscription, generation pack, or admin)
    const isPaid = isPaidUser || req.user.hasPaidAccess || req.user.role === 'admin'

    // Pass progress callback with extended params
    const generateParams = {
      subject: input.subject,
      grade: input.grade,
      topic: input.topic,
      taskTypes: input.taskTypes,
      difficulty: input.difficulty,
      format: input.format,
      variantIndex: input.variantIndex,
      isPaid,
    }

    const aiSessionId = crypto.randomUUID()
    const worksheet = await generationLimiter(() => withAIContext(
      { sessionId: aiSessionId, userId, subject: input.subject, grade: input.grade },
      () => ai.generateWorksheet(generateParams as GeneratePayload, (percent) => {
        sendEvent({ type: 'progress', percent })
      })
    ))

    // Client disconnected after AI generation — skip PDF/save, rollback cost
    if (clientDisconnected) {
      console.log(`[API] Client disconnected during generation, skipping PDF/save (user=${userId})`)
      await db.update(users).set({
        generationsLeft: sql`${users.generationsLeft} + ${cost}`,
        updatedAt: new Date(),
      }).where(eq(users.id, userId)).catch(e => console.error('[API] Rollback failed:', e))
      if (genRecord) {
        db.update(generations).set({ status: 'failed', errorMessage: 'Client disconnected' })
          .where(eq(generations.id, genRecord.id)).catch(() => {})
      }
      res.end()
      return
    }

    sendEvent({ type: 'progress', percent: 97 })

    // Build PDF with watermark for free users
    const addWatermark = planConfig.pdfWatermark && req.user.role !== 'admin'

    let pdfBase64: string | null = null
    try {
      pdfBase64 = await buildPdf(worksheet, input as GeneratePayload, 'standard', addWatermark)
    } catch (e) {
      console.error('[API] PDF generation error:', e)
      // Log failed generation to DB
      const pdfErrorMsg = 'PDF generation failed: ' + (e instanceof Error ? e.message : String(e))
      if (genRecord) {
        db.update(generations).set({
          status: 'failed',
          errorMessage: pdfErrorMsg,
        }).where(eq(generations.id, genRecord.id))
          .catch(dbErr => console.error('[API] Failed to update generation error:', dbErr))
      } else {
        db.insert(generations).values({
          userId,
          status: 'failed',
          subject: input.subject,
          grade: input.grade,
          topic: input.topic,
          errorMessage: pdfErrorMsg,
        }).catch(dbErr => console.error('[API] Failed to log generation error:', dbErr))
      }
      // Track failed generation for alerts
      trackGeneration(false).catch((err) => console.error('[Alerts] Failed to track generation:', err))
      sendInstantFailureAlert({
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        errorMessage: 'PDF generation failed: ' + (e instanceof Error ? e.message : String(e)),
        userEmail: req.user.email || undefined,
      }).catch((err) => console.error('[Alerts] Failed to send instant failure alert:', err))
      sendEvent({ type: 'error', code: 'PDF_ERROR', message: 'Ошибка генерации PDF.' })
      res.end()
      return
    }

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
    let dbId: string | null = null

    try {
      const tempWorksheet = {
        ...worksheet,
        id,
        grade: `${input.grade} класс`,
        pdfBase64: pdfBase64 ?? ''
      }

      const [inserted] = await db.insert(worksheets).values({
        userId,
        folderId: input.folderId || null,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        difficulty: input.difficulty || 'medium',
        content: JSON.stringify(tempWorksheet),
      }).returning({ id: worksheets.id })

      dbId = inserted?.id || null

      // Enforce worksheet limit per user's plan: soft-delete oldest beyond the cap
      const maxWorksheets = planConfig.maxWorksheets
      await db.execute(sql`
        UPDATE worksheets
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
          AND id NOT IN (
            SELECT id FROM worksheets
            WHERE user_id = ${userId} AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT ${maxWorksheets}
          )
      `)
    } catch (dbError) {
      console.error('[API] Failed to save worksheet to database:', dbError)
    }

    const finalWorksheet: Worksheet = {
      ...worksheet,
      id: dbId || id,
      grade: `${input.grade} класс`,
      pdfBase64: pdfBase64 ?? ''
    }

    // Mark generation as completed
    if (genRecord) {
      db.update(generations).set({
        status: 'completed',
        worksheetId: dbId,
        completedAt: new Date(),
      }).where(eq(generations.id, genRecord.id))
        .catch(e => console.error('[API] Failed to update generation status:', e))
    }

    // Track successful generation for alerts
    trackGeneration(true).catch((e) => console.error('[Alerts] Failed to track generation:', e))

    sendEvent({ type: 'result', data: { worksheet: finalWorksheet } })
    res.end()

  } catch (err: unknown) {
    console.error('[API] Generate error:', err)

    // Log failed generation to DB
    const errMsg = err instanceof Error ? err.message : String(err)
    if (genRecord) {
      db.update(generations).set({
        status: 'failed',
        errorMessage: errMsg,
      }).where(eq(generations.id, genRecord.id))
        .catch(dbErr => console.error('[API] Failed to update generation error:', dbErr))
    } else {
      db.insert(generations).values({
        userId,
        status: 'failed',
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        errorMessage: errMsg,
      }).catch(dbErr => console.error('[API] Failed to log generation error:', dbErr))
    }

    // Probabilistic cleanup: ~1/50 chance, delete old failed logs (30 days)
    if (Math.random() < 0.02) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      db.delete(generations).where(and(eq(generations.status, 'failed'), lt(generations.createdAt, thirtyDaysAgo)))
        .catch(e => console.error('[API] Failed to cleanup old generation logs:', e))
    }

    // Rollback: generation failed, restore the decremented limit
    await db
      .update(users)
      .set({
        generationsLeft: sql`${users.generationsLeft} + ${cost}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .catch((rollbackErr) => console.error('[API] Failed to rollback generationsLeft:', rollbackErr))

    // Track failed generation for alerts
    trackGeneration(false).catch((e) => console.error('[Alerts] Failed to track generation:', e))

    // Instant alert to admins
    sendInstantFailureAlert({
      subject: input.subject,
      grade: input.grade,
      topic: input.topic,
      errorMessage: err instanceof Error ? err.message : String(err),
      userEmail: req.user.email || undefined,
    }).catch((e) => console.error('[Alerts] Failed to send instant failure alert:', e))

    const code =
      err instanceof Error && err.message === 'AI_ERROR'
        ? 'AI_ERROR'
        : err instanceof Error && err.message === 'PDF_ERROR'
        ? 'PDF_ERROR'
        : 'SERVER_ERROR'

    sendEvent({ type: 'error', code, message: 'Не удалось сгенерировать лист. Попробуйте ещё раз.' })
    res.end()
  } finally {
    clearInterval(keepalive)
  }
}))

// ==================== POST /api/generate/regenerate-task ====================

const RegenerateInputSchema = z.object({
  taskIndex: z.number().int().min(0),
  taskType: TaskTypeIdSchema,
  isTest: z.boolean(),
  context: z.object({
    subject: z.enum(['math', 'algebra', 'geometry', 'russian']),
    grade: z.number().int().min(1).max(11),
    topic: z.string().min(3).max(200),
    difficulty: DifficultyLevelSchema,
  }),
})

router.post('/regenerate-task', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  const parse = RegenerateInputSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Проверьте введённые данные.',
    })
  }

  const input = parse.data
  const userId = req.user.id

  // Load subscription + plan config BEFORE checking limits
  const [sub] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  const planConfig = getUserPlanConfig(sub?.plan, sub?.status, sub?.currentPeriodEnd)

  // Check plan allows regen at all
  if (planConfig.dailyRegenLimit === 0 && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      code: 'PLAN_LIMIT',
      message: 'Перегенерация заданий доступна начиная с тарифа Начинающий.',
    })
  }

  // Check daily regen limit
  if (req.user.role !== 'admin') {
    const regenCheck = await checkDailyRegenLimit(userId, planConfig.dailyRegenLimit)
    if (!regenCheck.allowed) {
      return res.status(429).json({
        status: 'error',
        code: 'DAILY_REGEN_LIMIT',
        message: `Суточный лимит перегенераций исчерпан (${regenCheck.used}/${regenCheck.limit}). Лимит обновится после полуночи по МСК.`,
        used: regenCheck.used,
        limit: regenCheck.limit,
      })
    }
  }

  // Rate limit: 10 per minute
  const rateLimitResult = await checkRateLimit(req, {
    maxRequests: 10,
    windowSeconds: 60,
    identifier: `regen:${userId}`,
  })
  if (!rateLimitResult.success) {
    return res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов на перегенерацию. Попробуйте позже.',
    })
  }

  try {
    const isPaid = planConfig.paidModel || req.user.hasPaidAccess || req.user.role === 'admin'

    const ai = getAIProvider()
    const aiSessionId = crypto.randomUUID()
    const result = await generationLimiter(() => withAIContext(
      { sessionId: aiSessionId, userId, subject: input.context.subject, grade: input.context.grade },
      () => ai.regenerateTask({
        subject: input.context.subject,
        grade: input.context.grade,
        topic: input.context.topic,
        difficulty: input.context.difficulty,
        taskType: input.taskType,
        isTest: input.isTest,
        isPaid,
      })
    ))

    return res.json({
      status: 'ok',
      data: result,
    })
  } catch (err) {
    console.error('[API] Regenerate task error:', err)

    return res.status(500).json({
      status: 'error',
      code: 'AI_ERROR',
      message: 'Не удалось перегенерировать задание. Попробуйте ещё раз.',
    })
  }
}))

// ==================== POST /api/generate/rebuild-pdf ====================
// Regenerate PDF from edited worksheet content (no AI cost, just Puppeteer)
router.post('/rebuild-pdf', optionalAuth(async (req: Request, res: Response) => {
  try {
    // Rate limit by IP: 10 requests per minute
    const rl = await checkRateLimit(req, { maxRequests: 10, windowSeconds: 60 })
    if (!rl.success) {
      return res.status(429).json({ status: 'error', code: 'RATE_LIMIT', message: 'Слишком много запросов.' })
    }

    const { templateId: rawTemplateId, ...worksheetData } = req.body || {}
    const validTemplates: PdfTemplateId[] = ['standard', 'rainbow', 'academic']
    const templateId: PdfTemplateId = validTemplates.includes(rawTemplateId) ? rawTemplateId : 'standard'

    const parse = WorksheetSchema.safeParse(worksheetData)
    if (!parse.success) {
      return res.status(400).json({ status: 'error', code: 'INVALID_INPUT', message: 'Некорректные данные листа.' })
    }

    // Determine watermark based on user's plan
    let addWatermark = true // default: watermark for unauthenticated
    const authReq = req as AuthenticatedRequest
    if (authReq.user) {
      const [sub] = await db
        .select({ plan: subscriptions.plan, status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd })
        .from(subscriptions)
        .where(eq(subscriptions.userId, authReq.user.id))
        .limit(1)

      const planConfig = getUserPlanConfig(sub?.plan, sub?.status, sub?.currentPeriodEnd)
      addWatermark = planConfig.pdfWatermark && authReq.user.role !== 'admin'
    }

    const worksheet = parse.data as Worksheet
    const pdfBase64 = await buildPdf(worksheet, {} as GeneratePayload, templateId, addWatermark)

    return res.json({ status: 'ok', pdfBase64 })
  } catch (err) {
    console.error('[rebuild-pdf] Error:', err)
    return res.status(500).json({ status: 'error', code: 'PDF_ERROR', message: 'Не удалось сгенерировать PDF.' })
  }
}))

export default router
