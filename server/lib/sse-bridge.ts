import type { Response } from 'express'
import type { QueueEvents } from 'bullmq'

const JOB_TIMEOUT_MS = 180_000 // 3 minutes

interface SSEBridgeOptions<T> {
  jobId: string
  queueEvents: QueueEvents
  res: Response
  isDisconnected: () => boolean
  onProgress: (percent: number) => void
  onCompleted: (result: T) => Promise<void>
  onFailed: (error: string) => void
}

/**
 * Bridge BullMQ job events to SSE response.
 * Subscribes to QueueEvents for a specific jobId and forwards
 * progress/completed/failed to the SSE stream.
 *
 * Returns a promise that resolves when the job completes or fails.
 */
export function bridgeJobToSSE<T>(options: SSEBridgeOptions<T>): Promise<void> {
  const { jobId, queueEvents, res, isDisconnected, onProgress, onCompleted, onFailed } = options

  return new Promise<void>((resolve) => {
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      queueEvents.off('progress', handleProgress)
      queueEvents.off('completed', handleCompleted)
      queueEvents.off('failed', handleFailed)
      resolve()
    }

    // Timeout protection
    const timeout = setTimeout(() => {
      if (!settled) {
        onFailed('Generation timed out')
        settle()
      }
    }, JOB_TIMEOUT_MS)

    // Event handlers match QueueEventsListener signatures: (args, id) => void
    const handleProgress = (args: { jobId: string; data: string | boolean | number | object }, _id: string) => {
      if (args.jobId !== jobId || isDisconnected()) return
      const percent = typeof args.data === 'number'
        ? args.data
        : (typeof args.data === 'object' && args.data !== null && 'percent' in args.data)
          ? (args.data as { percent: number }).percent
          : 0
      onProgress(percent)
    }

    const handleCompleted = async (args: { jobId: string; returnvalue: string; prev?: string }, _id: string) => {
      if (args.jobId !== jobId) return
      try {
        const result = JSON.parse(args.returnvalue) as T
        await onCompleted(result)
      } catch (err) {
        onFailed(err instanceof Error ? err.message : 'Failed to process result')
      }
      settle()
    }

    const handleFailed = (args: { jobId: string; failedReason: string; prev?: string }, _id: string) => {
      if (args.jobId !== jobId) return
      onFailed(args.failedReason || 'Job failed')
      settle()
    }

    queueEvents.on('progress', handleProgress)
    queueEvents.on('completed', handleCompleted)
    queueEvents.on('failed', handleFailed)

    // If client already disconnected, settle immediately
    if (isDisconnected()) {
      settle()
    }
  })
}
