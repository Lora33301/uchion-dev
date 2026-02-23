# Subscription System (Prodamus)

## Plans (`shared/plans.ts` -- single source of truth)

| Plan | Price | Gens/month | Folders | Model |
|------|-------|------------|---------|-------|
| free | 0 | 5 (one-time) | 2 | deepseek-v3.2 (free) |
| starter | 390/mo | 25 | 10 | gpt-4.1 (paid) |
| teacher | 890/mo | 60 | 10 | gpt-4.1 (paid) |
| expert | 1690/mo | 120 | 10 | gpt-4.1 (paid) |

Types: `SubscriptionPlanId = 'free' | 'starter' | 'teacher' | 'expert'`, `PaidPlanId = 'starter' | 'teacher' | 'expert'`

## Architecture

Recurring subscriptions via **Prodamus club functionality**. Each plan has its own subscription ID in Prodamus panel:
- `PRODAMUS_SUBSCRIPTION_STARTER_ID`
- `PRODAMUS_SUBSCRIPTION_TEACHER_ID`
- `PRODAMUS_SUBSCRIPTION_EXPERT_ID`

## Subscription Flow

1. User selects plan on frontend (`BuyGenerationsModal.tsx`)
2. `POST /api/billing/subscribe` -- creates payment link + pending `payment_intent` (`sub_<plan>`)
3. Prodamus shows payment form, user pays
4. Prodamus sends webhook to `POST /api/billing/webhook` with `subscription` object
5. Webhook handler resolves userId via fallback chain, activates subscription
6. On auto-renewal: Prodamus repeats webhook (`autopayment=1`)
7. On failed charge: status `past_due`, generations NOT reset
8. On deactivation: status `expired`, user downgraded to free

## Webhook userId Fallback

**Critical: Prodamus does NOT forward `_param_*` fields in subscription webhooks.**

Resolution chain:
1. `payload._param_userId` -- direct pass-through (doesn't work for subscriptions)
2. `customer_email` -> find pending `payment_intent` with `sub_*` productCode
3. `customer_email` -> direct lookup in `users` table
4. `prodamusProfileId` -> lookup in `subscriptions` table (for auto-renewals)
5. `prodamusSubscriptionId` -> lookup in `subscriptions` table

## Webhook Endpoints

Both point to the same handler:
- `POST /api/billing/webhook` -- primary (configured in Prodamus)
- `POST /api/billing/prodamus/webhook` -- legacy alias

## Webhook Signature

- Header `Sign` format: `"Sign: <hmac_hash>"` -- must strip prefix
- HMAC-SHA256 with `PRODAMUS_SECRET`
- CORS skipped for webhook paths, but HMAC is mandatory

## Idempotency

- `webhook_events` table with unique key `(provider, event_key)`
- Event key for subscriptions: `sub:<subscriptionId>:<paymentNum>:<status>`
- Duplicate handling via `INSERT ... ON CONFLICT` (PostgreSQL error 23505)

## Key Files

- `shared/plans.ts` -- plan config (single source of truth)
- `server/routes/billing.ts` -- subscription endpoints + webhook handler
- `server/lib/prodamus.ts` -- link generation + HMAC signature verification
- `server/lib/billing-effects.ts` -- product effects (generations, subscriptions)
- `db/schema.ts` -- subscriptions table
- `src/components/BuyGenerationsModal.tsx` -- plan selection UI
