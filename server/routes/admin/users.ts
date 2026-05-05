import { Router } from 'express'
import type { Response } from 'express'
import { eq, and, isNull, isNotNull, desc, count, like, or, inArray, asc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db/index.js'
import { users, worksheets, generations, subscriptions, payments, folders, paymentIntents, refreshTokens } from '../../../db/schema.js'
import { withAdminAuth } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error-handler.js'
import { requireRateLimit } from '../../middleware/rate-limit.js'
import { revokeAllUserTokens } from '../../../api/_lib/auth/tokens.js'
import { invalidateUserCache } from '../../lib/user-cache.js'
import { generateReferralCode } from '../../lib/referral.js'
import { isValidPlanId, getPlanConfig } from '../../../shared/plans.js'
import type { AuthenticatedRequest } from '../../types.js'

/** Escape LIKE special characters to prevent wildcard injection */
function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}

const router = Router()

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ==================== GET /api/admin/users ====================
const UsersQuerySchema = z.object({
  page: z.string().optional().transform(v => Math.max(1, parseInt(v || '1'))),
  limit: z.string().optional().transform(v => Math.min(100, Math.max(1, parseInt(v || '20')))),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'blocked']).optional().default('active'),
  sortBy: z.enum(['createdAt', 'email', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

router.get('/', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  await requireRateLimit(req, {
    maxRequests: 30,
    windowSeconds: 60,
    identifier: `admin:users:${req.user.id}`,
  })

  const parse = UsersQuerySchema.safeParse(req.query)
  if (!parse.success) {
    throw ApiError.validation(parse.error.flatten().fieldErrors)
  }

  const { page, limit, search, status, sortBy, sortOrder } = parse.data
  const offset = (page - 1) * limit

  const conditions: ReturnType<typeof eq>[] = []

  if (status === 'active') {
    conditions.push(isNull(users.deletedAt))
  } else if (status === 'blocked') {
    conditions.push(isNotNull(users.deletedAt))
  }

  if (search && search.trim()) {
    const searchPattern = `%${escapeLike(search.trim())}%`
    conditions.push(
      or(
        like(users.email, searchPattern),
        like(users.name, searchPattern),
        like(users.providerId, searchPattern)
      )!
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  const [totalResult] = await db
    .select({ count: count() })
    .from(users)
    .where(whereClause)

  const getSortColumn = () => {
    switch (sortBy) {
      case 'email': return users.email
      case 'name': return users.name
      default: return users.createdAt
    }
  }
  const sortColumn = getSortColumn()

  const usersList = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
      provider: users.provider,
      providerId: users.providerId,
      generationsLeft: users.generationsLeft,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn))
    .limit(limit)
    .offset(offset)

  const userIds = usersList.map(u => u.id)

  let generationCounts: Record<string, number> = {}
  let worksheetCounts: Record<string, number> = {}

  if (userIds.length > 0) {
    const genCountsResult = await db
      .select({
        userId: generations.userId,
        count: count(),
      })
      .from(generations)
      .where(inArray(generations.userId, userIds))
      .groupBy(generations.userId)

    generationCounts = genCountsResult.reduce((acc, row) => {
      acc[row.userId] = row.count
      return acc
    }, {} as Record<string, number>)

    const worksheetCountsResult = await db
      .select({
        userId: worksheets.userId,
        count: count(),
      })
      .from(worksheets)
      .where(and(
        inArray(worksheets.userId, userIds),
        isNull(worksheets.deletedAt)
      ))
      .groupBy(worksheets.userId)

    worksheetCounts = worksheetCountsResult.reduce((acc, row) => {
      acc[row.userId] = row.count
      return acc
    }, {} as Record<string, number>)
  }

  const usersWithCounts = usersList.map(user => ({
    ...user,
    isBlocked: user.deletedAt !== null,
    generationsCount: Math.max(
      generationCounts[user.id] || 0,
      worksheetCounts[user.id] || 0
    ),
    worksheetsCount: worksheetCounts[user.id] || 0,
  }))

  return res.status(200).json({
    users: usersWithCounts,
    pagination: {
      page,
      limit,
      total: totalResult.count,
      totalPages: Math.ceil(totalResult.count / limit),
    }
  })
}))

// ==================== GET /api/admin/users/:id ====================
router.get('/:id', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  await requireRateLimit(req, {
    maxRequests: 60,
    windowSeconds: 60,
    identifier: `admin:user-detail:${req.user.id}`,
  })

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
      provider: users.provider,
      providerId: users.providerId,
      generationsLeft: users.generationsLeft,
      subscriptionPlan: users.subscriptionPlan,
      hasPaidAccess: users.hasPaidAccess,
      referralCode: users.referralCode,
      referredBy: users.referredBy,
      referredAt: users.referredAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) {
    throw ApiError.notFound('User not found')
  }

  // Count of users this user has referred (only relevant if they're an ambassador)
  const [referralsCountResult] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.referredBy, id), isNull(users.deletedAt)))

  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, id))
    .limit(1)

  const [generationsCountResult] = await db
    .select({ count: count() })
    .from(generations)
    .where(eq(generations.userId, id))

  const [worksheetsCountResult] = await db
    .select({ count: count() })
    .from(worksheets)
    .where(and(
      eq(worksheets.userId, id),
      isNull(worksheets.deletedAt)
    ))

  const userWorksheets = await db
    .select({
      id: worksheets.id,
      subject: worksheets.subject,
      grade: worksheets.grade,
      topic: worksheets.topic,
      title: worksheets.title,
      createdAt: worksheets.createdAt,
    })
    .from(worksheets)
    .where(and(
      eq(worksheets.userId, id),
      isNull(worksheets.deletedAt)
    ))
    .orderBy(desc(worksheets.createdAt))
    .limit(20)

  const userGenerations = await db
    .select({
      id: generations.id,
      status: generations.status,
      errorMessage: generations.errorMessage,
      createdAt: generations.createdAt,
      worksheetId: generations.worksheetId,
      worksheetSubject: worksheets.subject,
      worksheetGrade: worksheets.grade,
      worksheetTopic: worksheets.topic,
    })
    .from(generations)
    .leftJoin(worksheets, eq(generations.worksheetId, worksheets.id))
    .where(eq(generations.userId, id))
    .orderBy(desc(generations.createdAt))
    .limit(20)

  const totalGenerations = Math.max(
    generationsCountResult.count,
    worksheetsCountResult.count
  )

  return res.status(200).json({
    user: {
      ...user,
      isBlocked: user.deletedAt !== null,
      subscription: subscription || { plan: 'free', status: 'active', expiresAt: null },
      generationsCount: totalGenerations,
      worksheetsCount: worksheetsCountResult.count,
      referralsCount: referralsCountResult.count,
    },
    generations: userGenerations,
    worksheets: userWorksheets,
  })
}))

// ==================== POST /api/admin/users/:id/referral-code ====================
// Generates a referral code for a specific user (or returns the existing one).
// Idempotent: doesn't overwrite an existing code -- old links must keep working.
router.post('/:id/referral-code', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  await requireRateLimit(req, {
    maxRequests: 20,
    windowSeconds: 60,
    identifier: `admin:referral-code:${req.user.id}`,
  })

  const [target] = await db
    .select({ id: users.id, referralCode: users.referralCode, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!target) {
    throw ApiError.notFound('User not found')
  }
  if (target.deletedAt) {
    throw ApiError.badRequest('Cannot generate code for a blocked user')
  }
  if (target.referralCode) {
    return res.status(200).json({ referralCode: target.referralCode, created: false })
  }

  // Insert with retry on the rare collision (8-char base32 of 31 chars = ~31^8 space)
  let lastErr: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateReferralCode(8)
    try {
      const [updated] = await db
        .update(users)
        .set({ referralCode: candidate, updatedAt: new Date() })
        .where(and(eq(users.id, id), isNull(users.referralCode)))
        .returning({ referralCode: users.referralCode })
      if (updated?.referralCode) {
        console.log(`[Admin] Referral code generated for user ${id} by admin ${req.user.id}`)
        return res.status(200).json({ referralCode: updated.referralCode, created: true })
      }
      // Code already set in a race -- fetch and return it
      const [refetched] = await db
        .select({ referralCode: users.referralCode })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
      if (refetched?.referralCode) {
        return res.status(200).json({ referralCode: refetched.referralCode, created: false })
      }
    } catch (err) {
      lastErr = err
      // Unique violation -- try a new code
      const code = (err as { cause?: { code?: string } })?.cause?.code
      if (code !== '23505') throw err
    }
  }
  console.error('[Admin] Failed to allocate referral code after retries', lastErr)
  throw ApiError.internal('Failed to generate unique referral code')
}))

// ==================== GET /api/admin/users/:id/referrals ====================
// Returns the list of users invited by :id, with attribution metadata
// and a heuristic "suspicious" flag for fraud review.
router.get('/:id/referrals', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  await requireRateLimit(req, {
    maxRequests: 60,
    windowSeconds: 60,
    identifier: `admin:referrals:${req.user.id}`,
  })

  // Fetch the referrer's own row to compute "same IP as referrer" suspicion.
  const [referrer] = await db
    .select({
      id: users.id,
      email: users.email,
      referralCode: users.referralCode,
      referredIp: users.referredIp,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!referrer) {
    throw ApiError.notFound('User not found')
  }

  const invited = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      subscriptionPlan: users.subscriptionPlan,
      hasPaidAccess: users.hasPaidAccess,
      referredAt: users.referredAt,
      referredIp: users.referredIp,
      referredEmailNorm: users.referredEmailNorm,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.referredBy, id))
    .orderBy(desc(users.referredAt))
    .limit(500)

  // Detect duplicate normalized emails within this referrer's pool
  const normCounts = new Map<string, number>()
  for (const row of invited) {
    if (!row.referredEmailNorm) continue
    normCounts.set(row.referredEmailNorm, (normCounts.get(row.referredEmailNorm) ?? 0) + 1)
  }

  const referrals = invited.map((row) => {
    const flags: string[] = []
    if (referrer.referredIp && row.referredIp && row.referredIp === referrer.referredIp) {
      flags.push('same_ip_as_referrer')
    }
    if (row.referredEmailNorm && (normCounts.get(row.referredEmailNorm) ?? 0) > 1) {
      flags.push('duplicate_normalized_email')
    }
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      subscriptionPlan: row.subscriptionPlan,
      hasPaidAccess: row.hasPaidAccess,
      referredAt: row.referredAt,
      referredIp: row.referredIp,
      registeredAt: row.createdAt,
      isBlocked: row.deletedAt !== null,
      suspicious: flags.length > 0,
      flags,
    }
  })

  const paidCount = referrals.filter((r) => r.subscriptionPlan && r.subscriptionPlan !== 'free').length

  return res.status(200).json({
    referralCode: referrer.referralCode,
    total: referrals.length,
    paidCount,
    referrals,
  })
}))

// ==================== POST /api/admin/users/:id/block ====================
router.post('/:id/block', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  if (id === req.user.id) {
    throw ApiError.badRequest('Cannot block yourself')
  }

  await requireRateLimit(req, {
    maxRequests: 10,
    windowSeconds: 60,
    identifier: `admin:block-user:${req.user.id}`,
  })

  const [user] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) {
    throw ApiError.notFound('User not found')
  }

  if (user.deletedAt !== null) {
    throw ApiError.badRequest('User is already blocked')
  }

  await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, id))

  // Revoke all refresh tokens so blocked user can't refresh access
  await revokeAllUserTokens(id)

  // Invalidate user cache so auth middleware immediately sees the block
  await invalidateUserCache(id)

  console.log(`[Admin] User ${id} blocked by admin ${req.user.id}, all tokens revoked`)

  return res.status(200).json({ success: true })
}))

// ==================== POST /api/admin/users/:id/unblock ====================
router.post('/:id/unblock', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  await requireRateLimit(req, {
    maxRequests: 10,
    windowSeconds: 60,
    identifier: `admin:unblock-user:${req.user.id}`,
  })

  const [user] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) {
    throw ApiError.notFound('User not found')
  }

  if (user.deletedAt === null) {
    throw ApiError.badRequest('User is not blocked')
  }

  await db
    .update(users)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(users.id, id))

  await invalidateUserCache(id)

  console.log(`[Admin] User ${id} unblocked by admin ${req.user.id}`)

  return res.status(200).json({ success: true })
}))

// ==================== POST /api/admin/users/:id/grant-generations ====================
// Adds (or subtracts) generations on the user. Atomic, never goes below zero.
const GrantGenerationsSchema = z.object({
  amount: z.number().int().min(-1000).max(1000),
})

router.post('/:id/grant-generations', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  await requireRateLimit(req, {
    maxRequests: 30,
    windowSeconds: 60,
    identifier: `admin:grant-gens:${req.user.id}`,
  })

  const parse = GrantGenerationsSchema.safeParse(req.body)
  if (!parse.success) {
    throw ApiError.validation(parse.error.flatten().fieldErrors)
  }
  const { amount } = parse.data
  if (amount === 0) {
    throw ApiError.badRequest('Amount cannot be zero')
  }

  const [target] = await db
    .select({ id: users.id, generationsLeft: users.generationsLeft, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!target) {
    throw ApiError.notFound('User not found')
  }

  // Atomic update: clamp to 0, never negative.
  const [updated] = await db
    .update(users)
    .set({
      generationsLeft: sql`GREATEST(${users.generationsLeft} + ${amount}, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({ generationsLeft: users.generationsLeft })

  await invalidateUserCache(id)

  console.log(`[Admin] ${amount > 0 ? 'Granted' : 'Removed'} ${Math.abs(amount)} generation(s) for user ${id} by admin ${req.user.id} (now=${updated.generationsLeft})`)

  return res.status(200).json({
    success: true,
    generationsLeft: updated.generationsLeft,
  })
}))

// ==================== POST /api/admin/users/:id/change-plan ====================
// Manually change a user's subscription plan from the admin panel.
// - free: marks subscription as 'expired' (or removes), so paid features stop working.
// - starter/teacher/expert: upserts active subscription for 30 days, resets generations to plan limit.
const ChangePlanSchema = z.object({
  plan: z.enum(['free', 'starter', 'teacher', 'expert']),
  resetGenerations: z.boolean().optional().default(true),
  durationDays: z.number().int().min(1).max(3650).optional().default(30),
})

router.post('/:id/change-plan', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  await requireRateLimit(req, {
    maxRequests: 20,
    windowSeconds: 60,
    identifier: `admin:change-plan:${req.user.id}`,
  })

  const parse = ChangePlanSchema.safeParse(req.body)
  if (!parse.success) {
    throw ApiError.validation(parse.error.flatten().fieldErrors)
  }
  const { plan, resetGenerations, durationDays } = parse.data

  if (!isValidPlanId(plan)) {
    throw ApiError.badRequest('Invalid plan')
  }

  const [target] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!target) {
    throw ApiError.notFound('User not found')
  }

  const now = new Date()
  const planConfig = getPlanConfig(plan)

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .limit(1)

    if (plan === 'free') {
      // Demote to free: keep subscription row for history but mark expired.
      if (existing) {
        await tx
          .update(subscriptions)
          .set({
            plan: 'free',
            status: 'expired',
            generationsPerPeriod: 0,
            currentPeriodEnd: now,
            cancelledAt: now,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existing.id))
      }
      const userPatch: Record<string, unknown> = {
        subscriptionPlan: 'free',
        updatedAt: now,
      }
      if (resetGenerations) {
        userPatch.generationsLeft = planConfig.generationsPerPeriod
      }
      await tx.update(users).set(userPatch).where(eq(users.id, id))
    } else {
      // Activate paid plan
      const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
      if (existing) {
        await tx
          .update(subscriptions)
          .set({
            plan,
            status: 'active',
            generationsPerPeriod: planConfig.generationsPerPeriod,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelledAt: null,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existing.id))
      } else {
        await tx.insert(subscriptions).values({
          userId: id,
          plan,
          status: 'active',
          generationsPerPeriod: planConfig.generationsPerPeriod,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
      }
      const userPatch: Record<string, unknown> = {
        subscriptionPlan: plan,
        hasPaidAccess: true,
        updatedAt: now,
      }
      if (resetGenerations) {
        userPatch.generationsLeft = planConfig.generationsPerPeriod
      }
      await tx.update(users).set(userPatch).where(eq(users.id, id))
    }
  })

  await invalidateUserCache(id)

  console.log(`[Admin] Plan changed to '${plan}' for user ${id} by admin ${req.user.id} (resetGenerations=${resetGenerations}, durationDays=${durationDays})`)

  return res.status(200).json({
    success: true,
    plan,
    generationsPerPeriod: planConfig.generationsPerPeriod,
  })
}))

// ==================== DELETE /api/admin/users/:id/purge ====================
router.delete('/:id/purge', withAdminAuth(async (req: AuthenticatedRequest, res: Response) => {
  await requireRateLimit(req, {
    maxRequests: 5,
    windowSeconds: 60,
    identifier: `admin:purge:${req.user.id}`,
  })

  const userId = req.params.id
  if (!uuidRegex.test(userId)) {
    throw ApiError.badRequest('Invalid user ID format')
  }

  if (userId === req.user.id) {
    throw ApiError.badRequest('Cannot purge your own account')
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw ApiError.notFound('User not found')
  }

  await db.delete(paymentIntents).where(eq(paymentIntents.userId, userId))
  await db.delete(payments).where(eq(payments.userId, userId))
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId))
  await db.delete(generations).where(eq(generations.userId, userId))
  await db.delete(worksheets).where(eq(worksheets.userId, userId))
  await db.delete(folders).where(eq(folders.userId, userId))
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
  await db.delete(users).where(eq(users.id, userId))

  console.log(`[Admin] User ${userId} permanently purged by admin ${req.user.id}`)

  return res.status(200).json({
    success: true,
    message: 'User and all associated data permanently deleted',
  })
}))

export default router
