import type { Request, Response } from 'express'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users } from '../../db/schema.js'
import { getTokenFromCookie, ACCESS_TOKEN_COOKIE } from './cookies.js'
import { verifyAccessToken } from '../../api/_lib/auth/tokens.js'
import { ApiError } from './error-handler.js'
import { getCachedUser, setCachedUser } from '../lib/user-cache.js'
import type { AuthUser, AuthenticatedRequest } from '../types.js'

export type { AuthUser }

/**
 * Resolve user by ID: check Redis cache first, then DB.
 * On cache miss, writes to cache for subsequent requests.
 */
async function resolveUser(userId: string): Promise<AuthUser | null> {
  // Try cache first
  const cached = await getCachedUser(userId)
  if (cached) return cached

  // Cache miss — query DB
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      hasPaidAccess: users.hasPaidAccess,
    })
    .from(users)
    .where(and(
      eq(users.id, userId),
      isNull(users.deletedAt)
    ))
    .limit(1)

  if (!user) return null

  const authUser = user as AuthUser

  // Write to cache (non-blocking)
  setCachedUser(userId, authUser).catch(() => {})

  return authUser
}

/**
 * Middleware that requires authentication.
 * Throws ApiError.unauthorized if user is not authenticated.
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<void | Response> | void | Response
) {
  return async (req: Request, res: Response) => {
    const token = getTokenFromCookie(req, ACCESS_TOKEN_COOKIE)

    if (!token) {
      throw ApiError.unauthorized('Authentication required')
    }

    const payload = verifyAccessToken(token)

    if (!payload) {
      throw ApiError.unauthorized('Invalid or expired token')
    }

    const user = await resolveUser(payload.sub)

    if (!user) {
      throw ApiError.unauthorized('User not found or deactivated')
    }

    // Attach user to request
    ;(req as AuthenticatedRequest).user = user

    return await handler(req as AuthenticatedRequest, res)
  }
}

/**
 * Middleware that optionally authenticates.
 * If a valid token is present, attaches user to request.
 * If not, continues without user (req.user will be undefined).
 */
export function optionalAuth(
  handler: (req: Request, res: Response) => Promise<void | Response> | void | Response
) {
  return async (req: Request, res: Response) => {
    const token = getTokenFromCookie(req, ACCESS_TOKEN_COOKIE)

    if (token) {
      const payload = verifyAccessToken(token)
      if (payload) {
        const user = await resolveUser(payload.sub)
        if (user) {
          ;(req as AuthenticatedRequest).user = user
        }
      }
    }

    return await handler(req, res)
  }
}

/**
 * Middleware that requires admin role.
 * Throws ApiError.forbidden if user is not admin.
 */
export function withAdminAuth(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<void | Response> | void | Response
) {
  return withAuth(async (req, res) => {
    if (req.user.role !== 'admin') {
      throw ApiError.forbidden('Admin access required')
    }
    return await handler(req, res)
  })
}

/**
 * Express middleware that requires admin auth.
 * Use with router.use() to protect all routes in a router.
 * Unlike withAdminAuth (which wraps a handler), this calls next() on success.
 */
export async function requireAdmin(req: Request, res: Response, next: Function) {
  const token = getTokenFromCookie(req, ACCESS_TOKEN_COOKIE)

  if (!token) {
    throw ApiError.unauthorized('Authentication required')
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    throw ApiError.unauthorized('Invalid or expired token')
  }

  const user = await resolveUser(payload.sub)

  if (!user) {
    throw ApiError.unauthorized('User not found or deactivated')
  }

  if (user.role !== 'admin') {
    throw ApiError.forbidden('Admin access required')
  }

  ;(req as AuthenticatedRequest).user = user
  next()
}
