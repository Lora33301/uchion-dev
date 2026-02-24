// Concurrency limiter for AI generation requests.
// Prevents burst overload when many users generate simultaneously.
// Uses p-limit for in-memory semaphore (no Redis dependency).
// Replace with BullMQ job queue after migration to Timeweb with proper Redis.

import pLimit from 'p-limit'

const MAX_CONCURRENT_GENERATIONS = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '10')

export const generationLimiter = pLimit(MAX_CONCURRENT_GENERATIONS)
