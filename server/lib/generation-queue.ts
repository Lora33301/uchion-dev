import { Queue, Worker, QueueEvents, type Job } from 'bullmq'
import type { GeneratePayload } from '../../shared/types.js'

// ==================== Types ====================

export interface WorksheetJobData {
  type: 'worksheet'
  userId: string
  userEmail: string | null
  userRole: string
  hasPaidAccess: boolean
  input: {
    subject: 'math' | 'algebra' | 'geometry' | 'russian'
    grade: number
    topic: string
    taskTypes?: string[]
    difficulty?: string
    format?: string
    variantIndex?: number
    folderId?: string | null
  }
  isPaid: boolean
  cost: number
  addWatermark: boolean
  maxWorksheets: number
  genRecordId: string | null
}

export interface PresentationJobData {
  type: 'presentation'
  userId: string
  userEmail: string | null
  userRole: string
  hasPaidAccess: boolean
  input: {
    subject: 'math' | 'algebra' | 'geometry' | 'russian'
    grade: number
    topic: string
    themePreset: string
    slideCount: number
  }
  isPaid: boolean
  cost: number
  maxPresentations: number
}

export type GenerationJobData = WorksheetJobData | PresentationJobData

export interface GenerationJobResult {
  type: 'worksheet' | 'presentation'
  data: Record<string, unknown>
}

// ==================== Queue singleton ====================

const QUEUE_NAME = 'generation'
const CONCURRENCY = parseInt(process.env.GENERATION_CONCURRENCY || '5', 10)
const JOB_TIMEOUT_MS = 180_000 // 3 minutes

let queue: Queue<GenerationJobData, GenerationJobResult> | null = null
let worker: Worker<GenerationJobData, GenerationJobResult> | null = null
let queueEvents: QueueEvents | null = null

function getRedisOpts() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  // BullMQ accepts IORedis options or a connection URL parsed into options
  const parsed = new URL(url)
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1) || '0', 10) : 0,
    maxRetriesPerRequest: null as unknown as number, // BullMQ requirement
  }
}

// ==================== Init ====================

export function initGenerationQueue(): void {
  const connection = getRedisOpts()

  queue = new Queue<GenerationJobData, GenerationJobResult>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 1, // no retries — AI generation is not idempotent
      removeOnComplete: { age: 300 }, // keep completed jobs for 5 min (for SSE bridge)
      removeOnFail: { age: 300 },
    },
  })

  queueEvents = new QueueEvents(QUEUE_NAME, { connection })

  worker = new Worker<GenerationJobData, GenerationJobResult>(
    QUEUE_NAME,
    async (job) => processGenerationJob(job),
    {
      connection,
      concurrency: CONCURRENCY,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('[Queue] Worker error:', err.message)
  })

  console.log(`[Queue] Generation queue initialized (concurrency: ${CONCURRENCY})`)
}

// ==================== Public API ====================

export async function addGenerationJob(
  data: GenerationJobData
): Promise<string> {
  if (!queue) throw new Error('Generation queue not initialized')
  const job = await queue.add('generate', data, {
    // No per-job timeout — handled by SSE bridge timeout
  })
  return job.id!
}

export function getQueueEvents(): QueueEvents {
  if (!queueEvents) throw new Error('Generation queue not initialized')
  return queueEvents
}

export async function getJobResult(
  jobId: string
): Promise<GenerationJobResult | undefined> {
  if (!queue) return undefined
  const job = await queue.getJob(jobId)
  return job?.returnvalue
}

// ==================== Graceful Shutdown ====================

export async function closeGenerationQueue(): Promise<void> {
  console.log('[Queue] Shutting down generation queue...')
  const promises: Promise<void>[] = []
  if (worker) promises.push(worker.close())
  if (queueEvents) promises.push(queueEvents.close())
  if (queue) promises.push(queue.close())
  await Promise.all(promises)
  console.log('[Queue] Generation queue closed')
}

// ==================== Worker Logic ====================

async function processGenerationJob(
  job: Job<GenerationJobData, GenerationJobResult>
): Promise<GenerationJobResult> {
  if (job.data.type === 'worksheet') {
    return processWorksheetJob(job as Job<WorksheetJobData, GenerationJobResult>)
  } else {
    return processPresentationJob(job as Job<PresentationJobData, GenerationJobResult>)
  }
}

async function processWorksheetJob(
  job: Job<WorksheetJobData, GenerationJobResult>
): Promise<GenerationJobResult> {
  const { userId, input, isPaid, cost, addWatermark, maxWorksheets, genRecordId, userEmail } = job.data

  // Lazy imports to avoid circular dependencies at module load time
  const { getAIProvider } = await import('../../api/_lib/ai-provider.js')
  const { buildPdf } = await import('../../api/_lib/pdf.js')
  const { withAIContext } = await import('../../api/_lib/ai-usage.js')
  const { trackGeneration, sendInstantFailureAlert } = await import('../../api/_lib/alerts/generation-alerts.js')
  const { db } = await import('../../db/index.js')
  const { users, worksheets, generations } = await import('../../db/schema.js')
  const { eq, sql, and, lt } = await import('drizzle-orm')
  try {
    const ai = getAIProvider()

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
    const worksheet = await withAIContext(
      { sessionId: aiSessionId, userId, subject: input.subject, grade: input.grade },
      () => ai.generateWorksheet(generateParams as GeneratePayload, (percent) => {
        job.updateProgress({ percent })
      })
    )

    await job.updateProgress({ percent: 97 })

    // Build PDF
    let pdfBase64: string | null = null
    try {
      pdfBase64 = await buildPdf(worksheet, generateParams as GeneratePayload, 'standard', addWatermark)
    } catch (e) {
      console.error('[Queue/Worksheet] PDF generation error:', e)
      const pdfErrorMsg = 'PDF generation failed: ' + (e instanceof Error ? e.message : String(e))
      if (genRecordId) {
        db.update(generations).set({ status: 'failed', errorMessage: pdfErrorMsg })
          .where(eq(generations.id, genRecordId)).catch(dbErr => console.error('[Queue] Failed to update generation error:', dbErr))
      }
      trackGeneration(false).catch(() => {})
      sendInstantFailureAlert({
        subject: input.subject, grade: input.grade, topic: input.topic,
        errorMessage: pdfErrorMsg, userEmail: userEmail || undefined,
      }).catch(() => {})
      throw new Error('PDF_ERROR')
    }

    // Save to DB
    const id = crypto.randomUUID()
    let dbId: string | null = null

    try {
      const tempWorksheet = {
        ...worksheet,
        id,
        grade: `${input.grade} класс`,
        pdfBase64: pdfBase64 ?? '',
      }

      const [inserted] = await db.insert(worksheets).values({
        userId,
        folderId: input.folderId || null,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        difficulty: (input.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
        content: JSON.stringify(tempWorksheet),
      }).returning({ id: worksheets.id })

      dbId = inserted?.id || null

      // Enforce worksheet limit
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
      console.error('[Queue/Worksheet] Failed to save worksheet to database:', dbError)
    }

    const finalWorksheet = {
      ...worksheet,
      id: dbId || id,
      grade: `${input.grade} класс`,
      pdfBase64: pdfBase64 ?? '',
    }

    // Mark generation as completed
    if (genRecordId) {
      db.update(generations).set({
        status: 'completed', worksheetId: dbId, completedAt: new Date(),
      }).where(eq(generations.id, genRecordId))
        .catch(e => console.error('[Queue] Failed to update generation status:', e))
    }

    trackGeneration(true).catch(() => {})

    return { type: 'worksheet', data: { worksheet: finalWorksheet } }

  } catch (err: unknown) {
    console.error('[Queue/Worksheet] Generate error:', err)

    const errMsg = err instanceof Error ? err.message : String(err)

    // Log failed generation
    if (genRecordId) {
      db.update(generations).set({ status: 'failed', errorMessage: errMsg })
        .where(eq(generations.id, genRecordId))
        .catch(dbErr => console.error('[Queue] Failed to update generation error:', dbErr))
    } else {
      db.insert(generations).values({
        userId, status: 'failed', subject: input.subject, grade: input.grade,
        topic: input.topic, errorMessage: errMsg,
      }).catch(dbErr => console.error('[Queue] Failed to log generation error:', dbErr))
    }

    // Probabilistic cleanup
    if (Math.random() < 0.02) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      db.delete(generations).where(and(eq(generations.status, 'failed'), lt(generations.createdAt, thirtyDaysAgo)))
        .catch(e => console.error('[Queue] Failed to cleanup old generation logs:', e))
    }

    // Rollback generationsLeft
    await db.update(users).set({
      generationsLeft: sql`${users.generationsLeft} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
      .catch((rollbackErr) => console.error('[Queue] Failed to rollback generationsLeft:', rollbackErr))

    // Alerts
    const { trackGeneration: track, sendInstantFailureAlert: alert } = await import('../../api/_lib/alerts/generation-alerts.js')
    track(false).catch(() => {})
    alert({
      subject: input.subject, grade: input.grade, topic: input.topic,
      errorMessage: errMsg, userEmail: userEmail || undefined,
    }).catch(() => {})

    throw err
  }
}

async function processPresentationJob(
  job: Job<PresentationJobData, GenerationJobResult>
): Promise<GenerationJobResult> {
  const { userId, input, isPaid, cost, maxPresentations } = job.data

  const { getAIProvider, getClaudeProvider } = await import('../../api/_lib/ai-provider.js')
  const { generatePptx } = await import('../../api/_lib/presentations/generator.js')
  const { generatePresentationPdf } = await import('../../api/_lib/presentations/pdf-generator.js')
  const { sanitizePresentationStructure } = await import('../../api/_lib/presentations/sanitize.js')
  const { withAIContext } = await import('../../api/_lib/ai-usage.js')
  const { db } = await import('../../db/index.js')
  const { users, presentations } = await import('../../db/schema.js')
  const { eq, sql, desc, inArray } = await import('drizzle-orm')

  try {
    const claudeProvider = getClaudeProvider()
    const fallbackProvider = getAIProvider()
    const provider = claudeProvider || fallbackProvider
    console.log(`[Queue] Using ${claudeProvider ? 'Claude' : 'OpenAI'} provider for presentation generation`)

    const aiSessionId = crypto.randomUUID()
    const structure = await withAIContext(
      { sessionId: aiSessionId, userId, subject: input.subject, grade: input.grade },
      () => provider.generatePresentation({
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        themeType: 'preset',
        themePreset: input.themePreset,
        slideCount: input.slideCount as 12 | 18 | 24,
        isPaid,
      }, (percent) => {
        job.updateProgress({ percent })
      })
    )

    await job.updateProgress({ percent: 80 })

    const sanitizedStructure = sanitizePresentationStructure(structure)
    console.log(`[Queue] Sanitized: ${structure.slides.length} -> ${sanitizedStructure.slides.length} slides`)

    // Generate PPTX
    let pptxBase64: string
    try {
      pptxBase64 = await generatePptx(sanitizedStructure, input.themePreset as 'professional' | 'kids' | 'school')
    } catch (e) {
      console.error('[Queue/Presentation] PPTX generation error:', e)
      throw new Error('PPTX_ERROR')
    }

    await job.updateProgress({ percent: 90 })

    // Generate PDF (non-fatal)
    let pdfBase64: string
    try {
      pdfBase64 = await generatePresentationPdf(sanitizedStructure, input.themePreset as 'professional' | 'kids' | 'school')
    } catch (e) {
      console.error('[Queue/Presentation] PDF generation error:', e)
      pdfBase64 = ''
    }

    await job.updateProgress({ percent: 95 })

    // Save to DB
    const id = crypto.randomUUID()
    let dbId: string | null = null

    try {
      const [inserted] = await db.insert(presentations).values({
        userId,
        title: sanitizedStructure.title,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        themeType: 'preset' as const,
        themePreset: input.themePreset as 'professional' | 'educational' | 'minimal' | 'scientific' | 'kids' | 'school',
        themeCustom: null,
        slideCount: sanitizedStructure.slides.length,
        structure: JSON.stringify(sanitizedStructure),
        pptxBase64,
      }).returning({ id: presentations.id })

      dbId = inserted?.id || null

      // Enforce presentation limit
      if (maxPresentations > 0) {
        const userPresentations = await db
          .select({ id: presentations.id })
          .from(presentations)
          .where(eq(presentations.userId, userId))
          .orderBy(desc(presentations.createdAt))

        if (userPresentations.length > maxPresentations) {
          const toDelete = userPresentations.slice(maxPresentations).map(p => p.id)
          await db.delete(presentations).where(inArray(presentations.id, toDelete))
        }
      }
    } catch (dbError) {
      console.error('[Queue/Presentation] Failed to save presentation to database:', dbError)
    }

    return {
      type: 'presentation',
      data: {
        id: dbId || id,
        title: sanitizedStructure.title,
        pptxBase64,
        pdfBase64,
        slideCount: sanitizedStructure.slides.length,
        structure: sanitizedStructure,
      },
    }

  } catch (err: unknown) {
    console.error('[Queue/Presentation] Generate error:', err)

    // Rollback generationsLeft
    await db.update(users).set({
      generationsLeft: sql`${users.generationsLeft} + ${cost}`,
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
      .catch((rollbackErr) => console.error('[Queue] Failed to rollback generationsLeft:', rollbackErr))

    throw err
  }
}
