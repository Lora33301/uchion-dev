import type { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { paymentIntents } from '../../db/schema.js'
import { verifyWebhookSignature } from '../lib/prodamus.js'
import { applyProductEffect } from '../lib/billing-effects.js'
import { checkBillingWebhookRateLimit, getClientIp } from '../middleware/rate-limit.js'
import {
  PRODAMUS_SECRET,
  type ProdamusWebhookPayload,
  generateOrderId,
  hashPayload,
  tryMarkEventProcessed,
  APP_URL,
} from './billing-helpers.js'
import { handleSubscriptionWebhook } from './billing-subscription-webhook.js'

// ==================== MAIN WEBHOOK HANDLER ====================

/**
 * POST /api/billing/prodamus/webhook  (legacy path)
 * POST /api/billing/webhook            (primary path — configured in Prodamus panel)
 *
 * Receives payment notifications from Prodamus.
 * Verifies signature, checks idempotency, processes payment.
 */
export async function handleProdamusWebhook(req: Request, res: Response): Promise<Response | void> {
  const ip = getClientIp(req)

  // Rate limiting
  const rateLimitResult = await checkBillingWebhookRateLimit(req)
  if (!rateLimitResult.success) {
    console.warn(`[Prodamus Webhook] Rate limit exceeded for IP ${ip}`)
    return res.status(429).json({ error: 'Too many requests' })
  }

  try {
    console.log(`[Prodamus Webhook] Received from IP: ${ip}`)

    // Parse payload
    let payload: ProdamusWebhookPayload
    if (typeof req.body === 'object') {
      payload = req.body
    } else {
      return res.status(400).json({ error: 'Invalid payload format' })
    }

    // Get signature from request
    // Prodamus sends Sign header in format "Sign: <hash>" — strip the prefix
    let signature = payload.sign as string || req.headers['sign'] as string || ''
    if (signature.startsWith('Sign: ')) {
      signature = signature.slice(6)
    } else if (signature.startsWith('Sign:')) {
      signature = signature.slice(5).trim()
    }

    // Verify configuration
    if (!PRODAMUS_SECRET) {
      console.error('[Prodamus Webhook] PRODAMUS_SECRET not configured - rejecting webhook')
      return res.status(500).json({ status: 'configuration_error' })
    } else {
      // Verify signature
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sign: _sign, ...payloadWithoutSign } = payload

      if (!verifyWebhookSignature(payloadWithoutSign as Record<string, unknown>, signature, PRODAMUS_SECRET)) {
        console.warn(`[Prodamus Webhook] Invalid signature from IP: ${ip}`)
        return res.status(400).json({ error: 'Invalid signature' })
      }
    }

    // Determine if this is a subscription webhook
    const hasSubscription = payload.subscription && typeof payload.subscription === 'object'

    if (hasSubscription) {
      return await handleSubscriptionWebhook(payload, res)
    }

    // ==================== ONE-TIME PAYMENT HANDLING ====================

    // Get order_id (Prodamus may send it as order_id or order_num)
    const orderId = payload.order_id || payload.order_num
    if (!orderId) {
      console.error('[Prodamus Webhook] Missing order_id')
      return res.status(400).json({ error: 'Missing order_id' })
    }

    // Prepare idempotency data
    const paymentStatus = payload.payment_status || 'unknown'
    const eventKey = `${orderId}:${paymentStatus}`
    const rawBody = JSON.stringify(payload)
    const payloadHash = hashPayload(rawBody)

    // Atomic idempotency check - prevents race conditions
    const isFirstProcessing = await tryMarkEventProcessed('prodamus', eventKey, payloadHash)
    if (!isFirstProcessing) {
      console.log(`[Prodamus Webhook] Event already processed: ${eventKey}`)
      return res.status(200).json({ status: 'already_processed' })
    }

    // Find payment intent
    const [paymentIntent] = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.providerOrderId, String(orderId)))
      .limit(1)

    if (!paymentIntent) {
      console.warn(`[Prodamus Webhook] Unknown order_id: ${orderId}`)
      return res.status(200).json({ status: 'unknown_order' })
    }

    // Check if already paid (additional protection)
    if (paymentIntent.status === 'paid') {
      console.log(`[Prodamus Webhook] Payment already processed: ${orderId}`)
      return res.status(200).json({ status: 'already_paid' })
    }

    // Process based on status
    // Prodamus statuses: success, fail, pending
    const isSuccess = paymentStatus === 'success'
    const isFailed = paymentStatus === 'fail' || paymentStatus === 'failed'

    if (isFailed) {
      console.log(`[Prodamus Webhook] Payment failed for order: ${orderId}`)
      await db
        .update(paymentIntents)
        .set({ status: 'failed' })
        .where(eq(paymentIntents.id, paymentIntent.id))

      return res.status(200).json({ status: 'noted' })
    }

    if (!isSuccess) {
      console.log(`[Prodamus Webhook] Non-final status for ${orderId}: ${paymentStatus}`)
      return res.status(200).json({ status: 'noted' })
    }

    // Process successful payment
    console.log(`[Prodamus Webhook] Processing successful payment for order: ${orderId}`)

    // Update payment intent
    await db
      .update(paymentIntents)
      .set({
        status: 'paid',
        paidAt: new Date(),
      })
      .where(eq(paymentIntents.id, paymentIntent.id))

    // Apply product effect
    const effectResult = await applyProductEffect(
      paymentIntent.userId,
      paymentIntent.productCode
    )

    if (!effectResult.success) {
      console.error(`[Prodamus Webhook] Failed to apply effect: ${effectResult.message}`)
    }

    console.log(`[Prodamus Webhook] Successfully processed payment for order: ${orderId}`)
    return res.status(200).json({ status: 'processed' })

  } catch (error) {
    console.error('[Prodamus Webhook] Processing error:', error)
    return res.status(500).json({ error: 'Processing failed' })
  }
}

// ==================== TEST ENDPOINT (Development only) ====================

/**
 * Registers the development-only test payment page.
 * Only active when NODE_ENV=development, only accessible from localhost.
 */
export function registerTestPaymentRoute(
  router: import('express').Router
): void {
  if (process.env.NODE_ENV !== 'development') return

  router.get('/prodamus/test-payment', async (req: Request, res: Response) => {
    // Only allow on localhost to prevent access on staging/shared environments
    const host = req.hostname || req.headers.host || ''
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('localhost:') && !host.startsWith('127.0.0.1:')) {
      return res.status(404).json({ error: 'Not found' })
    }

    const { order_id } = req.query

    if (!order_id || typeof order_id !== 'string') {
      return res.status(400).send('Missing order_id')
    }

    // Sanitize order_id to prevent XSS
    const safeOrderId = order_id.replace(/[<>"'&]/g, '')

    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Тестовый платеж</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
          h2 { color: #333; }
          .order-id { font-family: monospace; background: #f5f5f5; padding: 4px 8px; border-radius: 4px; }
          .btn { display: inline-block; padding: 12px 24px; margin: 10px 5px; cursor: pointer; border: none; border-radius: 8px; font-size: 16px; }
          .success { background: #22c55e; color: white; }
          .success:hover { background: #16a34a; }
          .fail { background: #ef4444; color: white; }
          .fail:hover { background: #dc2626; }
          .note { color: #666; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h2>Тестовый платеж</h2>
        <p>Order ID: <span class="order-id" id="orderId"></span></p>
        <div>
          <button class="btn success" onclick="simulatePayment('success')">Оплатить</button>
          <button class="btn fail" onclick="simulatePayment('fail')">Отменить</button>
        </div>
        <p class="note">Это тестовая страница. В продакшене здесь будет форма Prodamus.</p>
        <script>
          const orderId = ${JSON.stringify(safeOrderId)};
          document.getElementById('orderId').textContent = orderId;

          async function simulatePayment(status) {
            try {
              const response = await fetch('/api/billing/prodamus/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id: orderId,
                  payment_status: status,
                  sum: '99.00',
                  currency: 'RUB',
                  date: new Date().toISOString(),
                })
              });
              const result = await response.json();

              if (status === 'success') {
                alert('Платеж успешно обработан!');
                window.location.href = '/payment/success?order_id=' + orderId;
              } else {
                alert('Платеж отменен');
                window.location.href = '/payment/cancel?order_id=' + orderId;
              }
            } catch (err) {
              alert('Ошибка: ' + err.message);
            }
          }
        </script>
      </body>
      </html>
    `
    return res.type('html').send(html)
  })
}

// Re-export generateOrderId so billing.ts can use it without importing billing-helpers directly
export { generateOrderId, APP_URL }
