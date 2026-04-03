import * as crypto from 'crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { webhookEvents } from '../../db/schema.js'
import type { PaidPlanId } from '../../shared/plans.js'

// ==================== CONFIGURATION ====================

export const PRODAMUS_SECRET = process.env.PRODAMUS_SECRET
export const PRODAMUS_PAYFORM_URL = process.env.PRODAMUS_PAYFORM_URL // e.g., https://your-shop.payform.ru/
export const APP_URL = process.env.APP_URL || 'http://localhost:3000'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Startup validation
if (IS_PRODUCTION) {
  if (!PRODAMUS_SECRET) {
    console.error('[FATAL] PRODAMUS_SECRET is required in production mode')
  }
  if (!PRODAMUS_PAYFORM_URL) {
    console.error('[FATAL] PRODAMUS_PAYFORM_URL is required in production mode')
  }
}

// Prodamus subscription product IDs (from Prodamus panel)
export const PRODAMUS_SUBSCRIPTION_IDS: Record<PaidPlanId, string | undefined> = {
  starter: process.env.PRODAMUS_SUBSCRIPTION_STARTER_ID,
  teacher: process.env.PRODAMUS_SUBSCRIPTION_TEACHER_ID,
  expert: process.env.PRODAMUS_SUBSCRIPTION_EXPERT_ID,
}

// ==================== TYPES ====================

export interface ProdamusWebhookPayload {
  order_id?: string
  order_num?: string
  payment_status?: string
  payment_status_description?: string
  payment_init?: string  // 'manual' | 'auto'
  sum?: string
  currency?: string
  date?: string
  sign?: string
  customer_phone?: string
  customer_email?: string
  customer_extra?: string
  // Subscription-specific fields (real Prodamus structure)
  subscription?: {
    id?: string
    profile_id?: string
    // Active flags are strings "0" or "1"
    active_user?: string
    active_user_date?: string
    active_manager?: string
    active_manager_date?: string
    // Payment tracking
    autopayment?: number | string  // 0 = first/manual, 1 = auto-debit (can be number or string)
    payment_num?: string
    autopayments_num?: string
    // Dates
    date_create?: string
    date_first_payment?: string
    date_last_payment?: string
    date_next_payment?: string
    date_next_payment_discount?: string
    date_completion?: string
    // Pricing
    cost?: string
    currency?: string
    name?: string
    // Limits
    limit_autopayments?: string
    first_payment_discount?: string
    next_payment_discount?: string
    next_payment_discount_num?: string
    // Meta
    demo?: string
    notification?: string
    process_started_at?: string
    [key: string]: unknown
  }
  // Pass-through params
  _param_userId?: string
  _param_plan?: string
  [key: string]: unknown
}

// ==================== HELPERS ====================

/**
 * Generate unique order ID for payment intent
 * Format: UC_{timestamp}_{random} (UC = Uchion)
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(6).toString('hex')
  return `UC_${timestamp}_${random}`
}

/**
 * Calculate SHA-256 hash of payload for idempotency
 */
export function hashPayload(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex')
}

/**
 * Try to atomically mark webhook event as processed (idempotency with race condition protection)
 * Returns true if this is the first processing, false if already processed
 *
 * Uses INSERT ... ON CONFLICT to ensure atomic check-and-insert
 */
export async function tryMarkEventProcessed(
  provider: string,
  eventKey: string,
  rawPayloadHash: string
): Promise<boolean> {
  try {
    // Attempt to insert - will fail if (provider, eventKey) already exists due to unique index
    await db.insert(webhookEvents).values({
      provider,
      eventKey,
      rawPayloadHash,
    })
    return true  // Successfully inserted - first time processing
  } catch (error: unknown) {
    // Check if it's a unique constraint violation (PostgreSQL error code 23505)
    // Drizzle wraps PG errors: error.cause may contain the actual PostgresError
    const pgCode =
      (error as { code?: string })?.code ||
      (error as { cause?: { code?: string } })?.cause?.code
    if (pgCode === '23505') {
      return false  // Already exists - duplicate
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Remove a previously marked webhook event so it can be retried.
 * Used when processing fails after tryMarkEventProcessed succeeded.
 */
export async function tryUnmarkEventProcessed(
  provider: string,
  eventKey: string
): Promise<void> {
  try {
    await db.delete(webhookEvents).where(
      and(
        eq(webhookEvents.provider, provider),
        eq(webhookEvents.eventKey, eventKey)
      )
    )
    console.log(`[Webhook] Unmarked event for retry: ${provider}:${eventKey}`)
  } catch (error) {
    console.error(`[Webhook] Failed to unmark event ${provider}:${eventKey}:`, error)
  }
}
