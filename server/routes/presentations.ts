import { Router } from 'express'
import type { Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { users, presentations, subscriptions } from '../../db/schema.js'
import { eq, sql, and, gt, desc, inArray } from 'drizzle-orm'
import { withAuth } from '../middleware/auth.js'
import { checkGenerateRateLimit } from '../middleware/rate-limit.js'
import type { AuthenticatedRequest } from '../types.js'
import { getUserPlanConfig } from '../../shared/plans.js'
import { addGenerationJob, getQueueEvents } from '../lib/generation-queue.js'

const router = Router()

// SSE event types
type SSEEvent =
  | { type: 'progress'; percent: number }
  | { type: 'result'; data: { id: string; title: string; pptxBase64: string; pdfBase64: string; slideCount: number; structure: import('../../shared/types').PresentationStructure } }
  | { type: 'error'; code: string; message: string }

const InputSchema = z.object({
  subject: z.enum(['math', 'algebra', 'geometry', 'russian']),
  grade: z.number().int().min(1).max(11),
  topic: z.string().min(3).max(200),
  themeType: z.literal('preset'),
  themePreset: z.enum(['professional', 'kids', 'school']).optional(),
  slideCount: z.union([z.literal(12), z.literal(18), z.literal(24)]).optional(),
})

// ==================== POST /api/presentations/generate ====================
router.post('/generate', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  // 1. Validate input
  const parse = InputSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0432\u0432\u0435\u0434\u0451\u043d\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435.',
    })
  }

  const input = parse.data

  // 2. Check themePreset is provided
  if (!input.themePreset) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0441\u0442\u0438\u043b\u044c \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u0438 (themePreset).',
    })
  }

  const userId = req.user.id

  // 3. Load subscription + check plan allows presentations
  const [subscription] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  const planConfig = getUserPlanConfig(subscription?.plan, subscription?.status, subscription?.currentPeriodEnd)

  if (!planConfig.canGeneratePresentation && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      code: 'PLAN_LIMIT',
      message: 'Презентации недоступны на вашем тарифе.',
    })
  }

  // Validate slide count against plan
  const slideCount = input.slideCount || 12
  if (planConfig.allowedSlideCounts.length > 0 && !planConfig.allowedSlideCounts.includes(slideCount) && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      code: 'PLAN_LIMIT',
      message: `Объём ${slideCount} слайдов недоступен на вашем тарифе. Доступно: ${planConfig.allowedSlideCounts.join(', ')} слайдов.`,
    })
  }

  // Presentation generation cost based on slide count
  const PRESENTATION_COST: Record<number, number> = { 12: 2, 18: 3, 24: 5 }
  const cost = PRESENTATION_COST[slideCount] ?? 2

  // 3b. Atomically decrement generationsLeft
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

  // 4. Rate limit: reuse checkGenerateRateLimit
  const rateLimitResult = await checkGenerateRateLimit(req, userId)
  if (!rateLimitResult.success) {
    // Rollback the atomic decrement
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
      message: `\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 ${Math.ceil(retryAfter / 60)} \u043c\u0438\u043d.`,
      retryAfter,
    })
  }

  // 5. Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendEvent = (data: SSEEvent) => {
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  // Determine if user has paid subscription (use better model)
  const isPaid = planConfig.paidModel || req.user.hasPaidAccess || req.user.role === 'admin'

  // Enqueue presentation generation job
  let jobId: string
  try {
    jobId = await addGenerationJob({
      type: 'presentation',
      userId,
      userEmail: req.user.email || null,
      userRole: req.user.role || 'user',
      hasPaidAccess: req.user.hasPaidAccess || false,
      input: {
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        themePreset: input.themePreset!,
        slideCount,
      },
      isPaid,
      cost,
      maxPresentations: planConfig.maxPresentations,
    })
  } catch (e) {
    console.error('[API] Failed to enqueue presentation job:', e)
    sendEvent({ type: 'error', code: 'SERVER_ERROR', message: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.' })
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
          sendEvent({ type: 'error', code: 'SERVER_ERROR', message: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.' })
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
        const code = args.failedReason === 'AI_ERROR' ? 'AI_ERROR' : 'SERVER_ERROR'
        sendEvent({ type: 'error', code, message: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.' })
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

// ==================== GET /api/presentations ====================
// List user's presentations (without heavy pptxBase64 field)
router.get('/', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { folderId, limit } = req.query

  const conditions = [eq(presentations.userId, req.user.id)]

  // Filter by folder
  if (folderId === 'null' || folderId === '') {
    // Root items (no folder)
    conditions.push(sql`${presentations.folderId} IS NULL`)
  } else if (typeof folderId === 'string' && folderId.length > 0) {
    conditions.push(eq(presentations.folderId, folderId))
  }

  const queryLimit = typeof limit === 'string' ? Math.min(parseInt(limit, 10) || 1000, 1000) : 1000

  const items = await db
    .select({
      id: presentations.id,
      folderId: presentations.folderId,
      title: presentations.title,
      subject: presentations.subject,
      grade: presentations.grade,
      topic: presentations.topic,
      themeType: presentations.themeType,
      themePreset: presentations.themePreset,
      slideCount: presentations.slideCount,
      createdAt: presentations.createdAt,
    })
    .from(presentations)
    .where(and(...conditions))
    .orderBy(desc(presentations.createdAt))
    .limit(queryLimit)

  res.json({
    presentations: items.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  })
}))

// ==================== GET /api/presentations/:id ====================
// Single presentation with full data (structure + pptxBase64)
router.get('/:id', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const [presentation] = await db
    .select()
    .from(presentations)
    .where(and(
      eq(presentations.id, id),
      eq(presentations.userId, req.user.id)
    ))
    .limit(1)

  if (!presentation) {
    return res.status(404).json({ error: 'Презентация не найдена' })
  }

  let structure = null
  try {
    structure = JSON.parse(presentation.structure)
  } catch {
    // Invalid JSON in DB
  }

  res.json({
    presentation: {
      id: presentation.id,
      title: presentation.title,
      subject: presentation.subject,
      grade: presentation.grade,
      topic: presentation.topic,
      themeType: presentation.themeType,
      themePreset: presentation.themePreset,
      themeCustom: presentation.themeCustom,
      slideCount: presentation.slideCount,
      structure,
      pptxBase64: presentation.pptxBase64 || '',
      createdAt: presentation.createdAt.toISOString(),
    },
  })
}))

// ==================== PATCH /api/presentations/:id ====================
// Update presentation title, folderId
router.patch('/:id', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const UpdateSchema = z.object({
    title: z.string().min(1).max(300).optional(),
    folderId: z.string().uuid().nullable().optional(),
  })

  const parse = UpdateSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid data' })
  }

  const [existing] = await db
    .select({ id: presentations.id })
    .from(presentations)
    .where(and(
      eq(presentations.id, id),
      eq(presentations.userId, req.user.id)
    ))
    .limit(1)

  if (!existing) {
    return res.status(404).json({ error: 'Презентация не найдена' })
  }

  const updates: Record<string, unknown> = {}
  if (parse.data.title !== undefined) updates.title = parse.data.title
  if (parse.data.folderId !== undefined) updates.folderId = parse.data.folderId

  if (Object.keys(updates).length > 0) {
    await db
      .update(presentations)
      .set(updates)
      .where(eq(presentations.id, id))
  }

  res.json({ success: true })
}))

// ==================== DELETE /api/presentations/:id ====================
router.delete('/:id', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const [existing] = await db
    .select({ id: presentations.id })
    .from(presentations)
    .where(and(
      eq(presentations.id, id),
      eq(presentations.userId, req.user.id)
    ))
    .limit(1)

  if (!existing) {
    return res.status(404).json({ error: 'Презентация не найдена' })
  }

  await db.delete(presentations).where(eq(presentations.id, id))

  res.json({ success: true })
}))

export default router
