import { eq, and, sql, lt } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { subscriptions, users } from '../../db/schema.js'
import { invalidateUserCache } from './user-cache.js'
import { sendAdminAlert } from '../../api/_lib/telegram/bot.js'

/**
 * Safety net: expire subscriptions whose period ended >1 day ago.
 * Handles cases where Prodamus webhook never arrived.
 *
 * 1-day grace period avoids racing with a late Prodamus webhook.
 */
export async function expireOverdueSubscriptions(): Promise<number> {
  // current_period_end < NOW() - INTERVAL '1 day'
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Find active (or past_due) subscriptions past the grace period
  const overdue = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      plan: subscriptions.plan,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(
      and(
        sql`${subscriptions.status} IN ('active', 'past_due')`,
        lt(subscriptions.currentPeriodEnd, cutoff)
      )
    )

  if (overdue.length === 0) return 0

  const now = new Date()

  for (const sub of overdue) {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(subscriptions)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(subscriptions.id, sub.id))

        await tx
          .update(users)
          .set({
            subscriptionPlan: 'free',
            generationsLeft: 0,
            updatedAt: now,
          })
          .where(eq(users.id, sub.userId))
      })

      await invalidateUserCache(sub.userId)
      console.log(`[Cron] Expired subscription for user ${sub.userId} (plan: ${sub.plan}, periodEnd: ${sub.currentPeriodEnd?.toISOString()})`)
    } catch (err) {
      console.error(`[Cron] Failed to expire subscription ${sub.id}:`, err)
    }
  }

  // Alert admins about forced expirations
  sendAdminAlert({
    message: `Принудительное завершение подписок (вебхук не пришёл): ${overdue.length} шт.\n${overdue.map(s => `• ${s.userId} (${s.plan}, до ${s.currentPeriodEnd?.toISOString()})`).join('\n')}`,
    level: 'warning',
  }).catch(() => {})

  return overdue.length
}
