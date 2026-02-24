import { Queue, Worker, QueueEvents } from 'bullmq'
import { createBullMQConnection } from './redis.js'
import { getAIProvider, getClaudeProvider } from '../../api/_lib/ai-provider.js'
import { withAIContext } from '../../api/_lib/ai-usage.js'
import type { GeneratePayload } from '../../shared/types.js'
import type { Subject } from '../../shared/worksheet.js'

// ==================== TYPES ====================

export interface WorksheetJobData {
  subject: Subject
  grade: number
  topic: string
  taskTypes?: string[]
  difficulty?: string
  format?: string
  variantIndex?: number
  isPaid: boolean
  userId: string
}

export interface PresentationJobData {
  subject: Subject
  grade: number
  topic: string
  themePreset: string
  slideCount: number
  isPaid: boolean
  userId: string
  useClaudeProvider: boolean
}

// ==================== CONFIG ====================

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '10')
const USE_BULLMQ = process.env.USE_BULLMQ === 'true'

let worksheetQueue: Queue | null = null
let presentationQueue: Queue | null = null
let worksheetWorker: Worker | null = null
let presentationWorker: Worker | null = null
let worksheetEvents: QueueEvents | null = null
let presentationEvents: QueueEvents | null = null
let queuesReady = false

// ==================== JOB OPTIONS ====================

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 86400, count: 200 },
}

// ==================== INIT ====================

export async function initQueues(): Promise<void> {
  if (!USE_BULLMQ) {
    console.log('[BullMQ] Disabled (USE_BULLMQ != true), using p-limit fallback')
    return
  }

  try {
    // Each BullMQ component needs its own connection with maxRetriesPerRequest: null
    worksheetQueue = new Queue('worksheet-generation', {
      connection: createBullMQConnection(),
      defaultJobOptions,
    })

    presentationQueue = new Queue('presentation-generation', {
      connection: createBullMQConnection(),
      defaultJobOptions,
    })

    // Workers process jobs in-process
    worksheetWorker = new Worker(
      'worksheet-generation',
      async (job) => {
        const data = job.data as WorksheetJobData
        const ai = getAIProvider()
        const aiSessionId = crypto.randomUUID()

        const worksheet = await withAIContext(
          { sessionId: aiSessionId, userId: data.userId, subject: data.subject, grade: data.grade },
          () => ai.generateWorksheet(
            {
              subject: data.subject,
              grade: data.grade,
              topic: data.topic,
              taskTypes: data.taskTypes,
              difficulty: data.difficulty,
              format: data.format,
              variantIndex: data.variantIndex,
              isPaid: data.isPaid,
            } as GeneratePayload,
            (percent) => {
              job.updateProgress(percent)
            }
          )
        )

        return worksheet
      },
      {
        connection: createBullMQConnection(),
        concurrency: MAX_CONCURRENT,
      }
    )

    presentationWorker = new Worker(
      'presentation-generation',
      async (job) => {
        const data = job.data as PresentationJobData
        const claudeProvider = data.useClaudeProvider ? getClaudeProvider() : null
        const fallbackProvider = getAIProvider()
        const provider = claudeProvider || fallbackProvider
        const aiSessionId = crypto.randomUUID()

        const structure = await withAIContext(
          { sessionId: aiSessionId, userId: data.userId, subject: data.subject, grade: data.grade },
          () => provider.generatePresentation(
            {
              subject: data.subject,
              grade: data.grade,
              topic: data.topic,
              themeType: 'preset',
              themePreset: data.themePreset,
              slideCount: data.slideCount as 12 | 18 | 24,
              isPaid: data.isPaid,
            },
            (percent) => {
              job.updateProgress(percent)
            }
          )
        )

        return structure
      },
      {
        connection: createBullMQConnection(),
        concurrency: MAX_CONCURRENT,
      }
    )

    // QueueEvents for SSE bridge subscriptions
    worksheetEvents = new QueueEvents('worksheet-generation', {
      connection: createBullMQConnection(),
    })

    presentationEvents = new QueueEvents('presentation-generation', {
      connection: createBullMQConnection(),
    })

    // Wait for events to be ready
    await worksheetEvents.waitUntilReady()
    await presentationEvents.waitUntilReady()

    worksheetWorker.on('error', (err) => {
      console.error('[BullMQ] Worksheet worker error:', err.message)
    })

    presentationWorker.on('error', (err) => {
      console.error('[BullMQ] Presentation worker error:', err.message)
    })

    queuesReady = true
    console.log(`[BullMQ] Initialized with concurrency=${MAX_CONCURRENT}`)
  } catch (err) {
    console.error('[BullMQ] Failed to initialize:', err)
    queuesReady = false
  }
}

// ==================== PUBLIC API ====================

export function isQueueAvailable(): boolean {
  return queuesReady && worksheetQueue !== null && presentationQueue !== null
}

export function getWorksheetQueue(): Queue | null {
  return worksheetQueue
}

export function getPresentationQueue(): Queue | null {
  return presentationQueue
}

export function getWorksheetEvents(): QueueEvents | null {
  return worksheetEvents
}

export function getPresentationEvents(): QueueEvents | null {
  return presentationEvents
}

// ==================== SHUTDOWN ====================

export async function closeQueues(): Promise<void> {
  if (!queuesReady) return

  console.log('[BullMQ] Shutting down...')
  queuesReady = false

  // Close workers first (waits for active jobs to finish, 10s grace)
  const closePromises: Promise<void>[] = []

  if (worksheetWorker) closePromises.push(worksheetWorker.close().catch(() => {}))
  if (presentationWorker) closePromises.push(presentationWorker.close().catch(() => {}))

  await Promise.all(closePromises)

  // Close events and queues
  if (worksheetEvents) await worksheetEvents.close().catch(() => {})
  if (presentationEvents) await presentationEvents.close().catch(() => {})
  if (worksheetQueue) await worksheetQueue.close().catch(() => {})
  if (presentationQueue) await presentationQueue.close().catch(() => {})

  worksheetWorker = null
  presentationWorker = null
  worksheetEvents = null
  presentationEvents = null
  worksheetQueue = null
  presentationQueue = null

  console.log('[BullMQ] Shutdown complete')
}
