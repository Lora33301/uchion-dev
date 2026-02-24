import { getRedisClient } from './redis.js'
import type { AuthUser } from '../types.js'

const USER_CACHE_PREFIX = 'user:'
const USER_CACHE_TTL = 300 // 5 minutes

/**
 * Get cached user from Redis. Fail-open: returns null on error.
 * Does NOT cache generationsLeft (queried atomically in generation routes).
 */
export async function getCachedUser(userId: string): Promise<AuthUser | null> {
  try {
    const redis = getRedisClient()
    if (!redis) return null

    const data = await redis.get(`${USER_CACHE_PREFIX}${userId}`)
    if (!data) return null

    return JSON.parse(data) as AuthUser
  } catch {
    return null
  }
}

/**
 * Cache user in Redis with TTL. Fail-open: silently ignores errors.
 */
export async function setCachedUser(userId: string, user: AuthUser): Promise<void> {
  try {
    const redis = getRedisClient()
    if (!redis) return

    await redis.set(
      `${USER_CACHE_PREFIX}${userId}`,
      JSON.stringify(user),
      'EX',
      USER_CACHE_TTL
    )
  } catch {
    // fail-open
  }
}

/**
 * Invalidate user cache. Call after block/unblock, role change, hasPaidAccess update.
 * Fail-open: silently ignores errors.
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    const redis = getRedisClient()
    if (!redis) return

    await redis.del(`${USER_CACHE_PREFIX}${userId}`)
  } catch {
    // fail-open
  }
}
