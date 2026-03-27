import { Router } from 'express'
import type { Request, Response } from 'express'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { paymentIntents, subscriptions } from '../../db/schema.js'
import { withAuth } from '../middleware/auth.js'
import {
  checkBillingCreateLinkRateLimit,
} from '../middleware/rate-limit.js'
import {
  generatePaymentLink,
  generateSubscriptionLink,
  formatExpirationDate,
  type ProdamusPaymentData,
} from '../lib/prodamus.js'
import {
  PRODUCTS,
  ALLOWED_GENERATION_COUNTS,
  getGenerationsPrice,
  type ProductInfo,
} from '../lib/billing-effects.js'
import { SUBSCRIPTION_PLANS, isPaidPlan, getPlanConfig } from '../../shared/plans.js'
import { sendAdminAlert } from '../../api/_lib/telegram/bot.js'
import {
  PRODAMUS_SECRET,
  PRODAMUS_PAYFORM_URL,
  PRODAMUS_SUBSCRIPTION_IDS,
  APP_URL,
  IS_PRODUCTION,
} from './billing-helpers.js'
import {
  handleProdamusWebhook,
  registerTestPaymentRoute,
  generateOrderId,
} from './billing-webhook.js'

const router = Router()

// ==================== TYPES ====================

interface CreateLinkPayload {
  productCode?: string
  generationsCount?: number  // Dynamic generations (5-200)
  customerEmail?: string
  customerPhone?: string
  paymentMethod?: string  // 'AC' (card), 'SBP', etc.
}

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Russian phone regex: +7 followed by 10 digits
const PHONE_REGEX = /^\+7\d{10}$/

// ==================== ROUTES ====================

/**
 * GET /api/billing/subscription-plans
 *
 * Returns available subscription plans
 */
router.get('/subscription-plans', (_req, res) => {
  const plans = Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    price: plan.price,
    generationsPerPeriod: plan.generationsPerPeriod,
    isRecurring: plan.isRecurring,
    folders: plan.folders,
    paidModel: plan.paidModel,
  }))
  return res.json({ plans })
})

/**
 * GET /api/billing/products
 *
 * Returns available products for purchase
 */
router.get('/products', (_req, res) => {
  const products = Object.entries(PRODUCTS).map(([code, info]) => ({
    code,
    name: info.name,
    price: info.price,
    type: info.type,
  }))

  return res.json({ products })
})

/**
 * POST /api/billing/prodamus/create-link
 *
 * Creates a payment intent and returns a Prodamus payment URL
 * Requires authentication
 */
router.post('/prodamus/create-link', withAuth(async (req, res) => {
  const userId = req.user.id
  const userEmail = req.user.email
  const userName = req.user.name

  // Rate limiting
  const rateLimitResult = await checkBillingCreateLinkRateLimit(req, userId)
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    console.warn(`[Billing] Rate limit exceeded for user ${userId}`)
    return res
      .status(429)
      .setHeader('Retry-After', retryAfter.toString())
      .json({ error: 'Слишком много запросов. Попробуйте позже.' })
  }

  try {
    const { productCode, generationsCount, customerEmail, customerPhone, paymentMethod } = req.body as CreateLinkPayload

    // Determine if this is a dynamic generations purchase or fixed product
    let product: ProductInfo | null = null
    let effectiveProductCode: string
    let isDynamicPurchase = false

    if (generationsCount !== undefined) {
      // Dynamic generations purchase
      if (typeof generationsCount !== 'number' || !Number.isInteger(generationsCount)) {
        return res.status(400).json({ error: 'Количество генераций должно быть целым числом' })
      }
      if (!ALLOWED_GENERATION_COUNTS.includes(generationsCount as any)) {
        return res.status(400).json({ error: `Допустимые количества генераций: ${ALLOWED_GENERATION_COUNTS.join(', ')}` })
      }

      isDynamicPurchase = true
      effectiveProductCode = `generations_dynamic_${generationsCount}`
      product = {
        name: `Пакет ${generationsCount} генераций`,
        price: getGenerationsPrice(generationsCount),
        type: 'generations',
        value: generationsCount,
      }
    } else if (productCode) {
      // Fixed product purchase (legacy support)
      effectiveProductCode = productCode
      product = PRODUCTS[productCode] || null
      if (!product) {
        return res.status(400).json({ error: 'Неизвестный код продукта' })
      }
    } else {
      return res.status(400).json({ error: 'Укажите количество генераций или код продукта' })
    }

    // Validate optional email format
    if (customerEmail && !EMAIL_REGEX.test(customerEmail)) {
      return res.status(400).json({ error: 'Некорректный формат email' })
    }

    // Validate optional phone format
    if (customerPhone && !PHONE_REGEX.test(customerPhone)) {
      return res.status(400).json({ error: 'Некорректный формат телефона. Ожидается: +7XXXXXXXXXX' })
    }

    // Check configuration
    if (!PRODAMUS_SECRET || !PRODAMUS_PAYFORM_URL) {
      if (IS_PRODUCTION) {
        console.error('[Billing] Missing Prodamus configuration')
        return res.status(500).json({ error: 'Платежная система не настроена' })
      }
      // Development mode - return test URL
      const testOrderId = generateOrderId()
      return res.status(201).json({
        success: true,
        orderId: testOrderId,
        paymentUrl: `${APP_URL}/api/billing/prodamus/test-payment?order_id=${testOrderId}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        testMode: true,
      })
    }

    // Generate unique order ID
    const orderId = generateOrderId()

    // Calculate expiration (1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Create payment intent in database BEFORE calling external API
    const [paymentIntent] = await db
      .insert(paymentIntents)
      .values({
        userId,
        productCode: effectiveProductCode,
        amount: product.price * 100,  // Store in kopecks
        currency: 'RUB',
        status: 'created',
        provider: 'prodamus',
        providerOrderId: orderId,
        metadata: JSON.stringify({
          productName: product.name,
          customerEmail: customerEmail || userEmail,
          customerPhone: customerPhone || null,
        }),
        expiresAt,
      })
      .returning()

    // Build payment data for Prodamus
    const paymentData: ProdamusPaymentData = {
      order_id: orderId,
      do: 'pay',
      products: [{
        name: product.name,
        price: String(product.price),
        quantity: '1',
        sku: effectiveProductCode,
      }],
      urlSuccess: `${APP_URL}/payment/success?order_id=${orderId}`,
      urlReturn: `${APP_URL}/payment/cancel?order_id=${orderId}`,
      link_expired: formatExpirationDate(expiresAt),
    }

    // Add customer FIO (name)
    if (userName) {
      paymentData.customer_fio = userName
    }

    // Add optional customer info
    // Don't send fake emails like "name@telegram" from Telegram auth
    const email = customerEmail || userEmail
    const isValidEmail = email && !email.endsWith('@telegram') && EMAIL_REGEX.test(email)
    if (isValidEmail) {
      paymentData.customer_email = email
    }
    if (customerPhone) {
      paymentData.customer_phone = customerPhone
    }
    if (paymentMethod) {
      paymentData.payment_method = paymentMethod
    }

    // Generate signed payment URL
    const paymentUrl = generatePaymentLink(
      PRODAMUS_PAYFORM_URL,
      paymentData,
      PRODAMUS_SECRET
    )

    console.log(`[Billing] Created payment link for order ${orderId}`)

    return res.status(201).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      orderId,
      paymentUrl,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[Billing] Create link error:', error)
    return res.status(500).json({ error: 'Не удалось создать платежную ссылку' })
  }
}))

/**
 * POST /api/billing/create-subscription-link
 *
 * Creates a Prodamus subscription payment link
 * Requires authentication, validates no active subscription exists
 */
router.post('/create-subscription-link', withAuth(async (req, res) => {
  const userId = req.user.id
  const userEmail = req.user.email
  const userName = req.user.name

  // Rate limiting (same as create-link)
  const rateLimitResult = await checkBillingCreateLinkRateLimit(req, userId)
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    console.warn(`[Subscription] Rate limit exceeded for user ${userId}`)
    return res
      .status(429)
      .setHeader('Retry-After', retryAfter.toString())
      .json({ error: 'Слишком много запросов. Попробуйте позже.' })
  }

  try {
    const { plan } = req.body as { plan?: string }

    // Validate plan
    if (!plan || !isPaidPlan(plan)) {
      return res.status(400).json({ error: 'Укажите корректный тариф: starter, teacher или expert' })
    }

    // Check for existing active subscription
    const [existingSub] = await db
      .select({ id: subscriptions.id, status: subscriptions.status, plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (existingSub && (existingSub.status === 'active' || existingSub.status === 'past_due')) {
      return res.status(409).json({
        error: 'У вас уже есть активная подписка. Сначала отмените текущую.',
        currentPlan: existingSub.plan,
      })
    }

    // Get Prodamus subscription ID
    const subscriptionId = PRODAMUS_SUBSCRIPTION_IDS[plan]

    // Check configuration
    if (!PRODAMUS_SECRET || !PRODAMUS_PAYFORM_URL) {
      if (IS_PRODUCTION) {
        console.error('[Subscription] Missing Prodamus configuration')
        return res.status(500).json({ error: 'Платежная система не настроена' })
      }
      // Development mode
      return res.status(201).json({
        success: true,
        paymentUrl: `${APP_URL}/payment/success?plan=${plan}`,
        testMode: true,
      })
    }

    if (!subscriptionId) {
      console.error(`[Subscription] Missing Prodamus subscription ID for plan: ${plan}`)
      return res.status(500).json({ error: 'Тариф не настроен в платежной системе' })
    }

    // Build subscription link with do=link (Prodamus returns short URL as plain text)
    const email = userEmail && !userEmail.endsWith('@telegram') && EMAIL_REGEX.test(userEmail) ? userEmail : undefined

    const prodamusUrl = generateSubscriptionLink(
      PRODAMUS_PAYFORM_URL,
      {
        subscription: subscriptionId,
        do: 'link',
        callbackType: 'json',
        customer_email: email,
        customer_fio: userName || undefined,
        urlSuccess: `${APP_URL}/payment/success?type=subscription&plan=${plan}`,
        urlReturn: `${APP_URL}/payment/cancel`,
        _param_userId: userId,
        _param_plan: plan,
      },
      PRODAMUS_SECRET
    )

    // Fetch the short link from Prodamus (do=link returns plain text URL)
    console.log(`[Subscription] Fetching short link from Prodamus for user ${userId}, plan: ${plan}`)
    const prodamusResponse = await fetch(prodamusUrl)

    if (!prodamusResponse.ok) {
      const errorText = await prodamusResponse.text().catch(() => '')
      console.error(`[Subscription] Prodamus returned ${prodamusResponse.status}: ${errorText}`)
      return res.status(502).json({ error: 'Не удалось получить ссылку на оплату от платежной системы' })
    }

    const paymentUrl = (await prodamusResponse.text()).trim()

    if (!paymentUrl || !paymentUrl.startsWith('http')) {
      console.error(`[Subscription] Invalid short link from Prodamus: ${paymentUrl}`)
      return res.status(502).json({ error: 'Платежная система вернула некорректную ссылку' })
    }

    console.log(`[Subscription] Got short link for user ${userId}, plan: ${plan}`)

    // Store pending subscription intent so webhook can look up userId/plan
    // (Prodamus does NOT forward _param_* fields in subscription webhooks)
    await db.insert(paymentIntents).values({
      userId,
      productCode: `sub_${plan}`,
      amount: getPlanConfig(plan).price * 100, // kopecks
      status: 'created',
      providerOrderId: `SUB_${generateOrderId()}`,
      metadata: JSON.stringify({ plan, type: 'subscription' }),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    })

    return res.status(201).json({
      success: true,
      paymentUrl,
    })
  } catch (error) {
    console.error('[Subscription] Create link error:', error)
    return res.status(500).json({ error: 'Не удалось создать ссылку на подписку' })
  }
}))

/**
 * POST /api/billing/cancel-subscription
 *
 * Cancels the user's active subscription.
 * Subscription remains active until currentPeriodEnd.
 * When period ends, Prodamus won't charge → webhook will downgrade to free.
 */
router.post('/cancel-subscription', withAuth(async (req, res) => {
  const userId = req.user.id

  // Rate limiting
  const rateLimitResult = await checkBillingCreateLinkRateLimit(req, userId)
  if (!rateLimitResult.success) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' })
  }

  try {
    // Find active subscription
    const [sub] = await db
      .select({
        id: subscriptions.id,
        plan: subscriptions.plan,
        status: subscriptions.status,
        prodamusSubscriptionId: subscriptions.prodamusSubscriptionId,
        prodamusProfileId: subscriptions.prodamusProfileId,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelledAt: subscriptions.cancelledAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (!sub || (sub.status !== 'active' && sub.status !== 'past_due')) {
      return res.status(404).json({ error: 'Активная подписка не найдена' })
    }

    if (sub.cancelledAt) {
      return res.status(409).json({
        error: 'Подписка уже отменена',
        cancelledAt: sub.cancelledAt.toISOString(),
        activeUntil: sub.currentPeriodEnd?.toISOString() || null,
      })
    }

    const now = new Date()

    // Try to deactivate via Prodamus API (best effort)
    // Prodamus requires both `subscription` (product ID) and `profile_id` (user instance)
    let prodamusDeactivated = false
    if (PRODAMUS_SECRET && PRODAMUS_PAYFORM_URL && sub.prodamusSubscriptionId && sub.prodamusProfileId) {
      try {
        const deactivateData: Record<string, unknown> = {
          subscription: sub.prodamusSubscriptionId,
          profile_id: sub.prodamusProfileId,
          do: 'deactivate',
        }
        const deactivateSignature = (await import('../lib/prodamus.js')).createProdamusSignature(
          deactivateData,
          PRODAMUS_SECRET
        )
        deactivateData.signature = deactivateSignature

        const baseUrl = PRODAMUS_PAYFORM_URL.endsWith('/') ? PRODAMUS_PAYFORM_URL : PRODAMUS_PAYFORM_URL + '/'
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(deactivateData)) {
          params.append(key, String(value))
        }

        console.log(`[Subscription] Deactivating via Prodamus: subId=${sub.prodamusSubscriptionId}, profileId=${sub.prodamusProfileId}`)
        const response = await fetch(`${baseUrl}?${params.toString()}`)
        const responseText = await response.text().catch(() => '')
        prodamusDeactivated = response.ok
        console.log(`[Subscription] Prodamus deactivation response: ${response.status}, body: ${responseText.slice(0, 200)}`)
      } catch (err) {
        console.warn('[Subscription] Prodamus deactivation failed:', err)
      }
    } else if (!sub.prodamusProfileId) {
      console.warn(`[Subscription] Cannot deactivate on Prodamus: missing profile_id for user ${userId}`)
    }

    // Mark as cancelled locally (subscription stays active until period end)
    await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, sub.id))

    // Do NOT change user's subscriptionPlan or generationsLeft yet
    // They keep access until period end

    const deactivationStatus = prodamusDeactivated
      ? 'OK'
      : !sub.prodamusProfileId
        ? 'НЕТ profile_id — деактивация невозможна!'
        : 'не удалось'

    sendAdminAlert({
      message: `Подписка отменена: ${sub.plan}\nПользователь: ${req.user.email}\nАктивна до: ${sub.currentPeriodEnd?.toISOString() || 'N/A'}\nProdamus деактивация: ${deactivationStatus}`,
      level: prodamusDeactivated ? 'info' : 'warning',
    }).catch(err => console.error('[Subscription] Alert error:', err))

    return res.status(200).json({
      success: true,
      message: 'Подписка отменена. Доступ сохраняется до конца оплаченного периода.',
      activeUntil: sub.currentPeriodEnd?.toISOString() || null,
      prodamusDeactivated,
    })
  } catch (error) {
    console.error('[Subscription] Cancel error:', error)
    return res.status(500).json({ error: 'Не удалось отменить подписку' })
  }
}))

/**
 * GET /api/billing/payment-status/:orderId
 *
 * Check payment status by order ID (for polling after redirect)
 */
router.get('/payment-status/:orderId', withAuth(async (req, res) => {
  const userId = req.user.id
  const { orderId } = req.params

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID required' })
  }

  const [paymentIntent] = await db
    .select({
      id: paymentIntents.id,
      status: paymentIntents.status,
      productCode: paymentIntents.productCode,
      paidAt: paymentIntents.paidAt,
    })
    .from(paymentIntents)
    .where(and(
      eq(paymentIntents.providerOrderId, orderId),
      eq(paymentIntents.userId, userId)
    ))
    .limit(1)

  if (!paymentIntent) {
    return res.status(404).json({ error: 'Payment not found' })
  }

  const product = PRODUCTS[paymentIntent.productCode]

  return res.json({
    status: paymentIntent.status,
    productName: product?.name || paymentIntent.productCode,
    paidAt: paymentIntent.paidAt?.toISOString() || null,
  })
}))

// ==================== WEBHOOK ROUTES ====================

// Register webhook on both paths (Prodamus panel uses /api/billing/webhook)
router.post('/webhook', handleProdamusWebhook)
router.post('/prodamus/webhook', handleProdamusWebhook)

// ==================== TEST ENDPOINT (Development only) ====================

registerTestPaymentRoute(router)

export default router
