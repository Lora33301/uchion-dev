import Redis from 'ioredis'
export type { Redis }

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient: Redis | null = null
let redisReady = false

export function getRedisClient(): Redis | null {
  if (redisClient && redisReady) return redisClient
  if (redisClient) return redisClient // Return even if not ready yet -- RateLimiterRedis handles reconnection

  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null
        return Math.min(times * 200, 2000)
      },
      enableOfflineQueue: true,
    })

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message)
      redisReady = false
    })

    redisClient.on('ready', () => {
      console.log('[Redis] Connected successfully')
      redisReady = true
    })

    return redisClient
  } catch (err) {
    console.error('[Redis] Initialization error:', err)
    return null
  }
}

/**
 * Create a new Redis connection for BullMQ.
 * BullMQ requires maxRetriesPerRequest: null for blocking BRPOPLPUSH.
 * Each BullMQ component (Queue, Worker, QueueEvents) needs its own connection.
 */
export function createBullMQConnection(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 10) return null
      return Math.min(times * 500, 5000)
    },
    enableOfflineQueue: true,
  })
}

/**
 * Check if Redis is connected and ready
 */
export function isRedisReady(): boolean {
  return redisReady
}

/**
 * Gracefully close the shared Redis client.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    redisReady = false
  }
}

/**
 * Get seconds until next midnight Moscow time (UTC+3)
 */
export function secondsUntilMidnightMSK(): number {
  const now = new Date()
  // Moscow is UTC+3
  const mskOffset = 3 * 60 * 60 * 1000
  const mskNow = new Date(now.getTime() + mskOffset)
  const mskMidnight = new Date(mskNow)
  mskMidnight.setUTCHours(24, 0, 0, 0)

  return Math.ceil((mskMidnight.getTime() - mskNow.getTime()) / 1000)
}
