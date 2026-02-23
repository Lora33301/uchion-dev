-- Add hasPaidAccess flag to users table
-- Set to true when user buys a generation pack (one-time purchase).
-- Subscriptions are tracked separately via subscriptions table + planConfig.paidModel.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_paid_access" boolean NOT NULL DEFAULT false;

-- Backfill: set hasPaidAccess=true for users who bought generation packs (not subscriptions)
UPDATE "users" SET "has_paid_access" = true
WHERE "id" IN (
  SELECT DISTINCT "user_id" FROM "payment_intents"
  WHERE "status" = 'paid' AND "product_code" NOT LIKE 'sub_%'
);
