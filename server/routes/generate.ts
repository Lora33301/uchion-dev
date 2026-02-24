import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { users, subscriptions, generations } from '../../db/schema.js'
import { eq, sql, and } from 'drizzle-orm'
import { buildPdf, type PdfTemplateId } from '../../api/_lib/pdf.js'
import { getAIProvider } from '../../api/_lib/ai-provider.js'
import { withAIContext } from '../../api/_lib/ai-usage.js'
import { withAuth, optionalAuth } from '../middleware/auth.js'
import { checkGenerateRateLimit, checkDailyGenerationLimit, checkRateLimit, checkDailyRegenLimit } from '../middleware/rate-limit.js'
import type { AuthenticatedRequest } from '../types.js'
import type { GeneratePayload, Worksheet } from '../../shared/types.js'
import { GenerateSchema, TaskTypeIdSchema, DifficultyLevelSchema, WorksheetSchema } from '../../shared/worksheet.js'
import { getUserPlanConfig } from '../../shared/plans.js'
import { calculateGenerationCost } from '../../api/_lib/generation/config/worksheet-formats.js'
import { addGenerationJob, getQueueEvents } from '../lib/generation-queue.js'

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

  const sendEvent = (data: SSEEvent) => {
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
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

  // Determine if user has paid access (subscription, generation pack, or admin)
  const isPaid = isPaidUser || req.user.hasPaidAccess || req.user.role === 'admin'
  const addWatermark = planConfig.pdfWatermark && req.user.role !== 'admin'

  // Enqueue generation job
  let jobId: string
  try {
    jobId = await addGenerationJob({
      type: 'worksheet',
      userId,
      userEmail: req.user.email || null,
      userRole: req.user.role || 'user',
      hasPaidAccess: req.user.hasPaidAccess || false,
      input: {
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        taskTypes: input.taskTypes,
        difficulty: input.difficulty,
        format: input.format,
        variantIndex: input.variantIndex,
        folderId: input.folderId,
      },
      isPaid,
      cost,
      addWatermark,
      maxWorksheets: planConfig.maxWorksheets,
      genRecordId: genRecord?.id || null,
    })
  } catch (e) {
    console.error('[API] Failed to enqueue generation job:', e)
    sendEvent({ type: 'error', code: 'SERVER_ERROR', message: 'Не удалось сгенерировать лист. Попробуйте ещё раз.' })
    res.end()
    return
  }

  // SSE bridge: listen to queue events and forward to client
  let clientDisconnected = false
  const queueEvents = getQueueEvents()
  const JOB_TIMEOUT_MS = 180_000 // 3 minutes

  const onProgress = (args: { jobId: string; data: string | boolean | number | object }) => {
    if (args.jobId !== jobId) return
    const progress = args.data as { percent: number }
    if (progress?.percent != null) {
      sendEvent({ type: 'progress', percent: progress.percent })
    }
  }

  const cleanup = () => {
    queueEvents.off('progress', onProgress)
    clearTimeout(timeoutHandle)
  }

  queueEvents.on('progress', onProgress)

  // Wait for completed or failed
  const jobPromise = new Promise<void>((resolve) => {
    const onCompleted = (args: { jobId: string; returnvalue: string }) => {
      if (args.jobId !== jobId) return
      queueEvents.off('completed', onCompleted)
      queueEvents.off('failed', onFailed)
      if (!clientDisconnected) {
        try {
          const result = typeof args.returnvalue === 'string' ? JSON.parse(args.returnvalue) : args.returnvalue
          sendEvent({ type: 'result', data: result.data })
        } catch (e) {
          console.error('[API] Failed to parse job result:', e)
          sendEvent({ type: 'error', code: 'SERVER_ERROR', message: 'Не удалось сгенерировать лист. Попробуйте ещё раз.' })
        }
        res.end()
      }
      resolve()
    }

    const onFailed = (args: { jobId: string; failedReason: string }) => {
      if (args.jobId !== jobId) return
      queueEvents.off('completed', onCompleted)
      queueEvents.off('failed', onFailed)
      if (!clientDisconnected) {
        const code = args.failedReason === 'AI_ERROR' ? 'AI_ERROR'
          : args.failedReason === 'PDF_ERROR' ? 'PDF_ERROR'
          : 'SERVER_ERROR'
        sendEvent({ type: 'error', code, message: 'Не удалось сгенерировать лист. Попробуйте ещё раз.' })
        res.end()
      }
      resolve()
    }

    queueEvents.on('completed', onCompleted)
    queueEvents.on('failed', onFailed)
  })

  // Timeout: if job takes too long, send error to client (job continues in worker)
  const timeoutHandle = setTimeout(() => {
    if (!clientDisconnected) {
      sendEvent({ type: 'error', code: 'TIMEOUT', message: 'Генерация заняла слишком долго. Результат будет сохранён в личном кабинете.' })
      clientDisconnected = true
      res.end()
    }
  }, JOB_TIMEOUT_MS)

  // Client disconnect: stop sending SSE, job continues in worker
  req.on('close', () => {
    clientDisconnected = true
    cleanup()
  })

  await jobPromise
  cleanup()
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
    const result = await withAIContext(
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
    )

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
