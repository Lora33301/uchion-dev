import { Router } from 'express'
import type { Request, Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { eq, and, isNull, desc, sql, gt, count } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { users, subscriptions, emailCodes, worksheets, presentations, folders } from '../../db/schema.js'
import {
  getTokenFromCookie,
  setAuthCookies,
  clearAuthCookies,
  clearOAuthCookies,
  setOAuthStateCookie,
  setPKCECookie,
  getStateCookie,
  getPKCECookie,
  getMailingConsentCookie,
  clearMailingConsentCookie,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../middleware/cookies.js'
import {
  verifyAccessToken,
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken,
  revokeRefreshToken,
  decodeRefreshToken,
  getTokenFamilyId,
} from '../../api/_lib/auth/tokens.js'
import {
  generateState,
  generatePKCE,
  buildYandexAuthUrl,
  exchangeYandexCode,
  validateState,
} from '../../api/_lib/auth/oauth.js'
import {
  checkAuthRateLimit,
  requireMeRateLimit,
  requireRefreshRateLimit,
  requireOAuthRedirectRateLimit,
  requireEmailSendCodeRateLimit,
  requireEmailVerifyCodeRateLimit,
  getDailyRegenCount,
} from '../middleware/rate-limit.js'
import { ApiError } from '../middleware/error-handler.js'
import {
  logLoginSuccess,
  logLoginFailed,
  logOAuthCallbackSuccess,
  logOAuthCallbackFailed,
  logRateLimitExceeded,
  logCsrfDetected,
} from '../middleware/audit-log.js'
import { sendOTPEmail } from '../../api/_lib/email.js'
import { getUserPlanConfig, SUBSCRIPTION_PLANS } from '../../shared/plans.js'

const router = Router()

// ==================== SHARED: findOrCreateUser ====================

interface FindOrCreateUserParams {
  email: string
  provider: 'yandex' | 'email'
  providerId: string
  name: string
  image?: string | null
  emailVerified?: Date | null
  mailingConsent: boolean
}

/**
 * Find user by email or create a new one.
 * Handles provider linking (Yandex→email account) and consent/emailVerified updates.
 * Throws ApiError.forbidden if user is blocked (soft-deleted).
 */
async function findOrCreateUser(params: FindOrCreateUserParams): Promise<{ id: string; email: string; role: string }> {
  const [existing] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
      provider: users.provider,
      emailVerified: users.emailVerified,
      mailingConsent: users.mailingConsent,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, params.email))
    .limit(1)

  if (existing?.deletedAt) {
    throw ApiError.forbidden('Аккаунт заблокирован')
  }

  if (!existing) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: params.email,
        name: params.name,
        image: params.image ?? null,
        provider: params.provider,
        providerId: params.providerId,
        emailVerified: params.emailVerified ?? null,
        role: 'user',
        generationsLeft: SUBSCRIPTION_PLANS.free.generationsPerPeriod,
        mailingConsent: params.mailingConsent,
      })
      .returning({ id: users.id, email: users.email, role: users.role })
    return newUser
  }

  // Update existing user as needed
  const updates: Record<string, unknown> = {}

  // Link Yandex OAuth to email-created account (provider not yet set)
  if (params.provider === 'yandex' && !existing.provider) {
    updates.provider = 'yandex'
    updates.providerId = params.providerId
    if (!existing.image && params.image) {
      updates.image = params.image
    }
  }

  // Set emailVerified on first email login
  if (params.emailVerified && !existing.emailVerified) {
    updates.emailVerified = params.emailVerified
  }

  // Mailing consent (one-way: false → true)
  if (params.mailingConsent && !existing.mailingConsent) {
    updates.mailingConsent = true
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date()
    await db.update(users).set(updates).where(eq(users.id, existing.id))
  }

  return { id: existing.id, email: existing.email, role: existing.role }
}

// ==================== GET /api/auth/me ====================
router.get('/me', async (req: Request, res: Response) => {
  await requireMeRateLimit(req)

  const token = getTokenFromCookie(req, ACCESS_TOKEN_COOKIE)

  if (!token) {
    throw ApiError.unauthorized('Not authenticated')
  }

  const payload = verifyAccessToken(token)

  if (!payload) {
    throw ApiError.unauthorized('Invalid or expired token')
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      generationsLeft: users.generationsLeft,
      subscriptionPlan: users.subscriptionPlan,
      telegramBonusClaimed: users.telegramBonusClaimed,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
    .limit(1)

  if (!user) {
    throw ApiError.unauthorized('User not found or deactivated')
  }

  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelledAt: subscriptions.cancelledAt,
      generationsPerPeriod: subscriptions.generationsPerPeriod,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, payload.sub))
    .limit(1)

  // Get plan config
  const planConfig = getUserPlanConfig(subscription?.plan, subscription?.status, subscription?.currentPeriodEnd)

  // Get usage counts in parallel
  const [
    [{ value: worksheetCount }],
    [{ value: presentationCount }],
    [{ value: folderCount }],
    dailyRegenUsed,
  ] = await Promise.all([
    db.select({ value: count() }).from(worksheets)
      .where(and(eq(worksheets.userId, payload.sub), isNull(worksheets.deletedAt))),
    db.select({ value: count() }).from(presentations)
      .where(eq(presentations.userId, payload.sub)),
    db.select({ value: count() }).from(folders)
      .where(and(eq(folders.userId, payload.sub), isNull(folders.deletedAt))),
    getDailyRegenCount(payload.sub),
  ])

  return res.status(200).json({
    user: {
      ...user,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            generationsLeft: user.generationsLeft,
            generationsTotal: subscription.generationsPerPeriod,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
            cancelledAt: subscription.cancelledAt?.toISOString() || null,
          }
        : {
            plan: 'free',
            status: 'active',
            generationsLeft: user.generationsLeft,
            generationsTotal: SUBSCRIPTION_PLANS.free.generationsPerPeriod,
            currentPeriodEnd: null,
            cancelledAt: null,
          },
      limits: {
        folders: planConfig.folders,
        maxWorksheets: planConfig.maxWorksheets,
        maxPresentations: planConfig.maxPresentations,
        canGeneratePresentation: planConfig.canGeneratePresentation,
        allowedSlideCounts: planConfig.allowedSlideCounts,
        dailyRegenLimit: planConfig.dailyRegenLimit,
        pdfTemplateStyles: planConfig.pdfTemplateStyles,
        pdfWatermark: planConfig.pdfWatermark,
      },
      usage: {
        worksheets: worksheetCount,
        presentations: presentationCount,
        folders: folderCount,
        dailyRegenUsed,
      },
    }
  })
})

// ==================== POST /api/auth/logout ====================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = getTokenFromCookie(req, REFRESH_TOKEN_COOKIE)

    if (refreshToken) {
      const payload = decodeRefreshToken(refreshToken)
      if (payload?.jti) {
        await revokeRefreshToken(payload.jti)
      }
    }

    clearAuthCookies(res)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[Logout] Error:', error)
    clearAuthCookies(res)
    return res.status(200).json({ success: true })
  }
})

// ==================== POST /api/auth/refresh ====================
router.post('/refresh', async (req: Request, res: Response) => {
  await requireRefreshRateLimit(req)

  try {
    const refreshToken = getTokenFromCookie(req, REFRESH_TOKEN_COOKIE)

    if (!refreshToken) {
      throw ApiError.unauthorized('No refresh token')
    }

    const payload = await verifyRefreshToken(refreshToken)

    if (!payload) {
      clearAuthCookies(res)
      throw ApiError.unauthorized('Invalid or expired token')
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
      .limit(1)

    if (!user) {
      clearAuthCookies(res)
      throw ApiError.unauthorized('User not found')
    }

    // Get family ID before revoking, so the new token inherits it
    const familyId = await getTokenFamilyId(payload.jti)
    await revokeRefreshToken(payload.jti)

    const newAccessToken = createAccessToken({
      userId: user.id,
      role: user.role,
    })
    const newRefreshToken = await createRefreshToken(user.id, familyId || undefined)

    setAuthCookies(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      // clearAuthCookies already called before the throw in the cases above
      throw error
    }
    console.error('[Refresh] Error:', error)
    clearAuthCookies(res)
    throw ApiError.unauthorized('Token refresh failed')
  }
})

// ==================== GET /api/auth/yandex/redirect ====================
router.get('/yandex/redirect', async (req: Request, res: Response) => {
  await requireOAuthRedirectRateLimit(req)

  const clientId = process.env.YANDEX_CLIENT_ID
  const appUrl = process.env.APP_URL

  if (!clientId) {
    console.error('[Yandex OAuth] YANDEX_CLIENT_ID not configured')
    throw ApiError.internal('OAuth not configured')
  }

  if (!appUrl) {
    console.error('[Yandex OAuth] APP_URL not configured')
    throw ApiError.internal('OAuth not configured')
  }

  const state = generateState()
  const { codeVerifier, codeChallenge } = generatePKCE()

  setOAuthStateCookie(res, state)
  setPKCECookie(res, codeVerifier)

  const redirectUri = `${appUrl}/api/auth/yandex/callback`
  const authUrl = buildYandexAuthUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  })

  return res.redirect(302, authUrl)
})

// ==================== GET /api/auth/yandex/callback ====================
// OAuth callbacks use redirects, not JSON -- keep inline error handling
router.get('/yandex/callback', async (req: Request, res: Response) => {
  const appUrl = process.env.APP_URL || ''

  const rateLimitResult = await checkAuthRateLimit(req)
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    logRateLimitExceeded(req, '/api/auth/yandex/callback')
    clearOAuthCookies(res)
    return res.redirect(302, `${appUrl}/login?error=rate_limit_exceeded`)
  }

  try {
    const { code, state, error: oauthError } = req.query

    if (oauthError) {
      console.error('[Yandex OAuth] Provider error:', oauthError)
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=oauth_error`)
    }

    if (!code || typeof code !== 'string') {
      console.error('[Yandex OAuth] Missing authorization code')
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=invalid_request`)
    }

    if (!state || typeof state !== 'string') {
      console.error('[Yandex OAuth] Missing state parameter')
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=invalid_request`)
    }

    const storedState = getStateCookie(req)
    if (!storedState) {
      logCsrfDetected(req, 'yandex', { provided_state: state, expected_state: null })
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=invalid_state`)
    }

    const stateBuffer = Buffer.from(state, 'utf8')
    const storedBuffer = Buffer.from(storedState, 'utf8')
    const statesMatch = stateBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(stateBuffer, storedBuffer)

    if (!statesMatch) {
      logCsrfDetected(req, 'yandex', { provided_state: state, expected_state: storedState })
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=invalid_state`)
    }

    if (!validateState(storedState)) {
      console.error('[Yandex OAuth] State expired or invalid format')
      logCsrfDetected(req, 'yandex', { state: storedState, reason: 'expired_or_invalid' })
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=invalid_state`)
    }

    const codeVerifier = getPKCECookie(req)
    if (!codeVerifier) {
      console.error('[Yandex OAuth] Missing PKCE code verifier')
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=invalid_request`)
    }

    const clientId = process.env.YANDEX_CLIENT_ID
    const clientSecret = process.env.YANDEX_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('[Yandex OAuth] Missing OAuth credentials')
      clearOAuthCookies(res)
      return res.redirect(302, `${appUrl}/login?error=configuration_error`)
    }

    const oauthUser = await exchangeYandexCode({
      code,
      clientId,
      clientSecret,
      codeVerifier,
    })

    const mailingConsent = getMailingConsentCookie(req)

    const user = await findOrCreateUser({
      email: oauthUser.email.toLowerCase(),
      provider: 'yandex',
      providerId: oauthUser.providerId,
      name: oauthUser.name,
      image: oauthUser.image,
      mailingConsent: !!mailingConsent,
    })

    const accessToken = createAccessToken({
      userId: user.id,
      role: user.role,
    })
    const refreshToken = await createRefreshToken(user.id)

    setAuthCookies(res, { accessToken, refreshToken })
    clearOAuthCookies(res)
    clearMailingConsentCookie(res)

    logOAuthCallbackSuccess(req, user.id, user.email, 'yandex')

    return res.redirect(302, appUrl || '/')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logOAuthCallbackFailed(req, errorMessage, 'yandex')
    console.error('[Yandex OAuth] Callback error:', error)
    clearOAuthCookies(res)
    return res.redirect(302, `${appUrl}/login?error=authentication_failed`)
  }
})

// ==================== POST /api/auth/email/send-code ====================
const emailSchema = z.string().email('Invalid email').max(255)

const sendCodeSchema = z.object({
  email: emailSchema,
})

router.post('/email/send-code', async (req: Request, res: Response) => {
  const parsed = sendCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid email address')
  }

  const email = parsed.data.email.toLowerCase()

  // Rate limit: 3 per 10 min per email
  await requireEmailSendCodeRateLimit(req, email)

  // Deduplication: if a valid code was created within the last 30 seconds, skip creating a new one
  const [recentCode] = await db
    .select({ id: emailCodes.id })
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.email, email),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, new Date()),
        gt(emailCodes.createdAt, new Date(Date.now() - 30 * 1000))
      )
    )
    .limit(1)

  if (recentCode) {
    // Code was already sent recently, return success without invalidating it
    return res.status(200).json({ ok: true })
  }

  // Invalidate all previous unused codes for this email
  await db
    .update(emailCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(emailCodes.email, email),
        isNull(emailCodes.usedAt)
      )
    )

  // Generate 6-digit code and hash it with bcrypt
  const code = crypto.randomInt(100000, 1000000).toString()
  const codeHash = await bcrypt.hash(code, 10)

  // Store hashed code with 10-minute expiry
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await db.insert(emailCodes).values({
    email,
    code: codeHash,
    expiresAt,
  })

  // Send email
  try {
    await sendOTPEmail(email, code)
  } catch (error) {
    console.error('[Email Auth] Failed to send OTP email:', error)
    throw ApiError.internal('Failed to send verification code')
  }

  return res.status(200).json({ ok: true })
})

// ==================== POST /api/auth/email/verify-code ====================
const verifyCodeSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  mailingConsent: z.boolean().optional(),
})

router.post('/email/verify-code', async (req: Request, res: Response) => {
  const parsed = verifyCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid email or code')
  }

  const email = parsed.data.email.toLowerCase()
  const { code } = parsed.data
  const mailingConsent = !!parsed.data.mailingConsent

  // Rate limit: 10 per 10 min per IP + per email
  await requireEmailVerifyCodeRateLimit(req, email)

  // Find the latest unused, non-expired code for this email
  const [record] = await db
    .select({
      id: emailCodes.id,
      attempts: emailCodes.attempts,
    })
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.email, email),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, new Date())
      )
    )
    .orderBy(desc(emailCodes.createdAt))
    .limit(1)

  if (!record || record.attempts >= 5) {
    logLoginFailed(req, 'Invalid or expired code', 'email', { email })
    throw ApiError.badRequest('Invalid or expired code')
  }

  // Atomic increment + check to prevent race condition (C1 fix)
  const [updated] = await db
    .update(emailCodes)
    .set({ attempts: sql`${emailCodes.attempts} + 1` })
    .where(
      and(
        eq(emailCodes.id, record.id),
        isNull(emailCodes.usedAt),
        sql`${emailCodes.attempts} < 5`
      )
    )
    .returning({ attempts: emailCodes.attempts, code: emailCodes.code })

  if (!updated) {
    logLoginFailed(req, 'Code exhausted or already used', 'email', { email })
    throw ApiError.badRequest('Invalid or expired code')
  }

  // Verify OTP with bcrypt (constant-time comparison built into bcrypt.compare)
  const codeMatch = await bcrypt.compare(code, updated.code)
  if (!codeMatch) {
    logLoginFailed(req, 'Wrong OTP code', 'email', { email, attempts: updated.attempts })
    throw ApiError.badRequest('Invalid or expired code')
  }

  // Mark code as used
  await db
    .update(emailCodes)
    .set({ usedAt: new Date() })
    .where(eq(emailCodes.id, record.id))

  // Find or create user
  const user = await findOrCreateUser({
    email,
    provider: 'email',
    providerId: email,
    name: email.split('@')[0],
    emailVerified: new Date(),
    mailingConsent,
  })

  const accessToken = createAccessToken({
    userId: user.id,
    role: user.role,
  })
  const refreshToken = await createRefreshToken(user.id)

  setAuthCookies(res, { accessToken, refreshToken })

  logLoginSuccess(req, user.id, user.email, 'email')

  return res.status(200).json({ ok: true })
})

// ==================== POST /api/auth/claim-telegram-bonus ====================
/**
 * Claim a one-time bonus generation for visiting the Telegram channel.
 * Awards 1 extra generation. Can only be claimed once per account.
 */
router.post('/claim-telegram-bonus', async (req: Request, res: Response) => {
  const token = getTokenFromCookie(req, ACCESS_TOKEN_COOKIE)
  if (!token) throw ApiError.unauthorized('Not authenticated')

  const payload = verifyAccessToken(token)
  if (!payload) throw ApiError.unauthorized('Invalid or expired token')

  // Atomically claim: only update if not yet claimed
  const [updated] = await db
    .update(users)
    .set({
      telegramBonusClaimed: true,
      generationsLeft: sql`${users.generationsLeft} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, payload.sub),
        eq(users.telegramBonusClaimed, false),
        isNull(users.deletedAt),
      )
    )
    .returning({ id: users.id, generationsLeft: users.generationsLeft })

  if (!updated) {
    // Already claimed or user not found
    return res.status(200).json({ ok: true, alreadyClaimed: true })
  }

  return res.status(200).json({
    ok: true,
    alreadyClaimed: false,
    generationsLeft: updated.generationsLeft,
  })
})

export default router
