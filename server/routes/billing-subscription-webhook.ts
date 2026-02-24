import type { Response } from 'express'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { paymentIntents, subscriptions, users } from '../../db/schema.js'
import { isPaidPlan, getPlanConfig } from '../../shared/plans.js'
import { sendAdminAlert } from '../../api/_lib/telegram/bot.js'
import {
  PRODAMUS_SUBSCRIPTION_IDS,
  type ProdamusWebhookPayload,
  hashPayload,
  tryMarkEventProcessed,
} from './billing-helpers.js'

// ==================== USER RESOLUTION ====================

/**
 * Resolve userId from webhook payload using a fallback chain.
 * Prodamus does NOT forward _param_* fields in subscription webhooks,
 * so we need multiple strategies to identify the user.
 *
 * Returns { userId, planFromParam } — both may be undefined if resolution fails.
 */
async function resolveSubscriptionUserId(
  payload: ProdamusWebhookPayload
): Promise<{ userId: string | undefined; planFromParam: string | undefined }> {
  let userId = (payload['_param_userId'] ?? payload._param_userId) as string | undefined
  let planFromParam = (payload['_param_plan'] ?? payload._param_plan) as string | undefined
  const customerEmail = payload.customer_email as string | undefined
  const customerPhone = payload.customer_phone as string | undefined
  const prodamusSubId = payload.subscription?.id || ''
  const prodamusProfileId = payload.subscription?.profile_id || ''

  console.log(`[Subscription Webhook] Resolving user: _param_userId=${userId}, email=${customerEmail}, phone=${customerPhone}`)

  // Fallback 1: look up pending subscription intent by email
  // Always try to resolve plan from intent, even if userId is already known
  // (Prodamus may forward _param_userId but NOT _param_plan)
  if (customerEmail) {
    const intentConditions = [
      sql`${paymentIntents.productCode} LIKE 'sub_%'`,
      eq(paymentIntents.status, 'created'),
    ]

    // If we already have userId, look up intent for this specific user
    // Otherwise, look up by email
    if (userId) {
      intentConditions.push(eq(paymentIntents.userId, userId))
    } else {
      intentConditions.push(
        sql`${paymentIntents.userId} IN (SELECT id FROM users WHERE email = ${customerEmail})`
      )
    }

    const [intent] = await db
      .select({ userId: paymentIntents.userId, productCode: paymentIntents.productCode })
      .from(paymentIntents)
      .where(and(...intentConditions))
      .orderBy(sql`${paymentIntents.createdAt} DESC`)
      .limit(1)

    if (intent) {
      if (!userId) userId = intent.userId
      // Extract plan from productCode: "sub_starter" -> "starter"
      if (!planFromParam) planFromParam = intent.productCode.replace('sub_', '')
      console.log(`[Subscription Webhook] Resolved by intent: userId=${userId}, plan=${planFromParam}`)
    }
  }

  // Fallback 2: look up user directly by email
  if (!userId && customerEmail) {
    const [userByEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, customerEmail))
      .limit(1)

    if (userByEmail) {
      userId = userByEmail.id
      console.log(`[Subscription Webhook] Resolved by email in users: userId=${userId}`)
    }
  }

  // Fallback 3: look up by existing subscription with this prodamus profile/sub ID
  // Wrapped in try/catch because prodamus_profile_id column may not exist yet (migration pending)
  if (!userId && (prodamusProfileId || prodamusSubId)) {
    try {
      if (prodamusProfileId) {
        const [existingSub] = await db
          .select({ userId: subscriptions.userId, plan: subscriptions.plan })
          .from(subscriptions)
          .where(eq(subscriptions.prodamusProfileId, prodamusProfileId))
          .limit(1)

        if (existingSub) {
          userId = existingSub.userId
          if (!planFromParam) planFromParam = existingSub.plan
          console.log(`[Subscription Webhook] Resolved by prodamusProfileId: userId=${userId}`)
        }
      }

      if (!userId && prodamusSubId) {
        const [existingSub] = await db
          .select({ userId: subscriptions.userId, plan: subscriptions.plan })
          .from(subscriptions)
          .where(eq(subscriptions.prodamusSubscriptionId, prodamusSubId))
          .limit(1)

        if (existingSub) {
          userId = existingSub.userId
          if (!planFromParam) planFromParam = existingSub.plan
          console.log(`[Subscription Webhook] Resolved by prodamusSubId: userId=${userId}`)
        }
      }
    } catch (err) {
      console.warn(`[Subscription Webhook] Fallback 3 query failed (migration pending?):`, (err as Error).message)
    }
  }

  return { userId, planFromParam }
}

// ==================== PLAN RESOLUTION ====================

/**
 * Resolve subscription plan from available signals:
 * - planFromParam (from payment intent or _param_plan)
 * - prodamusSubId reverse-lookup against env var IDs
 * - existing DB subscription for the user
 * - last resort: default to 'starter' with admin alert
 */
async function resolvePlanFromSubscription(
  planFromParam: string | undefined,
  prodamusSubId: string,
  userId: string,
  userEmail: string | undefined
): Promise<string> {
  let plan = planFromParam

  // Fallback: reverse-lookup plan from Prodamus subscription ID
  if ((!plan || !isPaidPlan(plan)) && prodamusSubId) {
    for (const [planId, subId] of Object.entries(PRODAMUS_SUBSCRIPTION_IDS)) {
      if (subId && subId === prodamusSubId) {
        plan = planId
        console.log(`[Subscription Webhook] Resolved plan by prodamusSubId: ${plan}`)
        break
      }
    }
  }

  if (!plan || !isPaidPlan(plan)) {
    // Try to get from existing subscription (but only if it's a paid plan)
    const [existingSub] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (existingSub?.plan && isPaidPlan(existingSub.plan)) {
      plan = existingSub.plan
    } else {
      plan = 'starter' // last resort default
      sendAdminAlert({
        message: `Plan resolution failed, defaulting to starter!\nUser: ${userEmail || userId}\nprodamusSubId: ${prodamusSubId}\nplanFromParam: ${planFromParam || 'none'}`,
        level: 'warning',
      }).catch(() => {})
    }
    console.log(`[Subscription Webhook] Plan fallback from DB/default: ${plan}`)
  }

  return plan
}

// ==================== EVENT HANDLERS ====================

async function handleFirstPayment(
  userId: string,
  plan: string,
  prodamusSubId: string,
  prodamusProfileId: string,
  payload: ProdamusWebhookPayload,
  user: { id: string; email: string | null },
  now: Date,
  periodEnd: Date
): Promise<Response> {
  const planConfig = getPlanConfig(plan)
  console.log(`[Subscription Webhook] First payment for user ${userId}, plan: ${plan}`)

  await db.transaction(async (tx) => {
    // Upsert subscription record
    const [existing] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (existing) {
      await tx
        .update(subscriptions)
        .set({
          prodamusSubscriptionId: prodamusSubId,
          prodamusProfileId: prodamusProfileId,
          plan: plan,
          status: 'active',
          generationsPerPeriod: planConfig.generationsPerPeriod,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          customerEmail: payload.customer_email || user.email,
          customerPhone: payload.customer_phone || null,
          cancelledAt: null,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existing.id))
    } else {
      await tx
        .insert(subscriptions)
        .values({
          userId,
          prodamusSubscriptionId: prodamusSubId,
          prodamusProfileId: prodamusProfileId,
          plan: plan,
          status: 'active',
          generationsPerPeriod: planConfig.generationsPerPeriod,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          customerEmail: payload.customer_email || user.email,
          customerPhone: payload.customer_phone || null,
        })
    }

    // Update user: set plan + reset generations to plan limit
    await tx
      .update(users)
      .set({
        subscriptionPlan: plan,
        generationsLeft: planConfig.generationsPerPeriod,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
  })

  // Send admin alert (non-blocking)
  sendAdminAlert({
    message: `Новая подписка: ${planConfig.name} (${planConfig.price}₽/мес)\nПользователь: ${user.email}\nГенераций: ${planConfig.generationsPerPeriod}`,
    level: 'info',
  }).catch(err => console.error('[Subscription Webhook] Alert error:', err))

  return { status: 'subscription_activated' } as unknown as Response
}

async function handleAutoRenewal(
  userId: string,
  plan: string,
  user: { id: string; email: string | null },
  now: Date,
  periodEnd: Date
): Promise<{ status: string }> {
  const planConfig = getPlanConfig(plan)
  console.log(`[Subscription Webhook] Auto-renewal for user ${userId}, plan: ${plan}`)

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        plan: plan,
        status: 'active',
        generationsPerPeriod: planConfig.generationsPerPeriod,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId))

    // Reset generations to plan limit for new period
    await tx
      .update(users)
      .set({
        subscriptionPlan: plan,
        generationsLeft: planConfig.generationsPerPeriod,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
  })

  sendAdminAlert({
    message: `Автопродление: ${planConfig.name}\nПользователь: ${user.email}\nГенераций начислено: ${planConfig.generationsPerPeriod}`,
    level: 'info',
  }).catch(err => console.error('[Subscription Webhook] Alert error:', err))

  return { status: 'subscription_renewed' }
}

async function handleFailedAutoPayment(
  userId: string,
  plan: string,
  sub: NonNullable<ProdamusWebhookPayload['subscription']>,
  user: { id: string; email: string | null },
  now: Date
): Promise<{ status: string }> {
  const planConfig = getPlanConfig(plan)
  console.log(`[Subscription Webhook] Failed auto-payment for user ${userId}`)

  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: now,
    })
    .where(eq(subscriptions.userId, userId))

  // Do NOT reset generations — grace period while Prodamus retries

  sendAdminAlert({
    message: `Неудачное автосписание: ${planConfig.name}\nПользователь: ${user.email}\nПопытка: ${(sub as Record<string, unknown>).current_attempt || '?'}/${(sub as Record<string, unknown>).max_attempts || '?'}`,
    level: 'warning',
  }).catch(err => console.error('[Subscription Webhook] Alert error:', err))

  return { status: 'payment_failed_noted' }
}

async function handleSubscriptionEnded(
  userId: string,
  plan: string,
  user: { id: string; email: string | null },
  now: Date
): Promise<{ status: string }> {
  const planConfig = getPlanConfig(plan)
  console.log(`[Subscription Webhook] Subscription ended for user ${userId}`)

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId))

    // Downgrade user to free
    await tx
      .update(users)
      .set({
        subscriptionPlan: 'free',
        generationsLeft: 0,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
  })

  sendAdminAlert({
    message: `Подписка завершена: ${planConfig.name}\nПользователь: ${user.email}\nСтатус: free, 0 генераций`,
    level: 'warning',
  }).catch(err => console.error('[Subscription Webhook] Alert error:', err))

  return { status: 'subscription_expired' }
}

// ==================== MAIN HANDLER ====================

/**
 * Handle subscription-specific webhook from Prodamus.
 * Determines event type from subscription block fields and processes accordingly.
 */
export async function handleSubscriptionWebhook(
  payload: ProdamusWebhookPayload,
  res: Response
): Promise<Response> {
  const sub = payload.subscription!
  const paymentStatus = payload.payment_status || 'unknown'
  // autopayment can be number 0/1 or string "0"/"1"
  const isAutopayment = sub.autopayment === 1 || sub.autopayment === '1'
  // Real Prodamus data uses active_user and active_manager (strings "0"/"1")
  const subscriptionInactive = sub.active_user === '0' || sub.active_manager === '0'
  const prodamusSubId = sub.id || ''
  const prodamusProfileId = sub.profile_id || ''

  // ==================== RESOLVE USER ID ====================
  const { userId, planFromParam } = await resolveSubscriptionUserId(payload)

  // Build idempotency key using subscription ID + payment_num + status
  const paymentNum = sub.payment_num || '0'
  const eventKey = `sub:${prodamusSubId}:${paymentNum}:${paymentStatus}`
  const rawBody = JSON.stringify(payload)
  const payloadHash = hashPayload(rawBody)

  const isFirstProcessing = await tryMarkEventProcessed('prodamus_subscription', eventKey, payloadHash)
  if (!isFirstProcessing) {
    console.log(`[Subscription Webhook] Already processed: ${eventKey}`)
    return res.status(200).json({ status: 'already_processed' })
  }

  console.log(`[Subscription Webhook] Event: status=${paymentStatus}, autopayment=${isAutopayment}, active_user=${sub.active_user}, active_manager=${sub.active_manager}, payment_num=${sub.payment_num}, subId=${prodamusSubId}, profileId=${prodamusProfileId}, user=${userId}`)

  // Validate userId resolved
  if (!userId) {
    const customerEmail = payload.customer_email as string | undefined
    const customerPhone = payload.customer_phone as string | undefined
    console.error(`[Subscription Webhook] Cannot resolve userId. email=${customerEmail}, phone=${customerPhone}, profileId=${prodamusProfileId}, subId=${prodamusSubId}`)
    return res.status(200).json({ status: 'missing_user_id' })
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    console.error(`[Subscription Webhook] User not found: ${userId}`)
    return res.status(200).json({ status: 'user_not_found' })
  }

  // Mark subscription intent as paid (if one exists)
  await db
    .update(paymentIntents)
    .set({ status: 'paid', paidAt: new Date() })
    .where(
      and(
        eq(paymentIntents.userId, userId),
        sql`${paymentIntents.productCode} LIKE 'sub_%'`,
        eq(paymentIntents.status, 'created')
      )
    )

  // ==================== PLAN RESOLUTION ====================
  const plan = await resolvePlanFromSubscription(planFromParam, prodamusSubId, userId, user.email ?? undefined)

  // Calculate period dates
  const now = new Date()
  const nextPaymentDate = sub.date_next_payment ? new Date(sub.date_next_payment) : null
  const periodEnd = nextPaymentDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days default

  // ==================== EVENT ROUTING ====================

  const isSuccess = paymentStatus === 'success'

  if (isSuccess && !isAutopayment) {
    // FIRST PAYMENT (user-initiated purchase)
    await handleFirstPayment(userId, plan, prodamusSubId, prodamusProfileId, payload, user, now, periodEnd)
    return res.status(200).json({ status: 'subscription_activated' })
  }

  if (isSuccess && isAutopayment) {
    // AUTO-RENEWAL (successful recurring payment)
    const result = await handleAutoRenewal(userId, plan, user, now, periodEnd)
    return res.status(200).json(result)
  }

  const isFailed = paymentStatus === 'fail' || paymentStatus === 'failed'

  if (!isSuccess && isAutopayment && !isFailed) {
    // NON-FINAL STATUS (e.g. status=unknown) — Prodamus informational webhook, ignore
    console.log(`[Subscription Webhook] Non-final autopayment status=${paymentStatus} for user ${userId}, ignoring`)
    return res.status(200).json({ status: 'noted' })
  }

  if (isFailed && isAutopayment) {
    // FAILED AUTO-PAYMENT (explicit fail/failed status only)
    const result = await handleFailedAutoPayment(userId, plan, sub, user, now)
    return res.status(200).json(result)
  }

  if (subscriptionInactive) {
    // SUBSCRIPTION ENDED (final notification — deactivated or expired)
    const result = await handleSubscriptionEnded(userId, plan, user, now)
    return res.status(200).json(result)
  }

  // Unknown event type — log and acknowledge
  console.warn(`[Subscription Webhook] Unhandled event: payment_status=${paymentStatus}, autopayment=${sub.autopayment}, active=${sub.active}`)

  return res.status(200).json({ status: 'noted' })
}
