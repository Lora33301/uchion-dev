-- Step 1: Convert users.subscription_plan from old enum to varchar(20)
-- On prod this column is still enum('free','basic','premium') from migration 0000.
-- Migration 0010 tried ADD COLUMN IF NOT EXISTS but it was skipped since column existed.
ALTER TABLE "users" ALTER COLUMN "subscription_plan" TYPE varchar(20) USING "subscription_plan"::text;
ALTER TABLE "users" ALTER COLUMN "subscription_plan" SET DEFAULT 'free';

-- Step 2: Fix subscription record — was saved as 'free' instead of 'starter'
UPDATE "subscriptions" SET "plan_v2" = 'starter', "generations_per_period" = 25, "updated_at" = NOW()
WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "email" = 'ingakovalski1@gmail.com')
  AND "plan_v2" = 'free';

-- Step 3: Fix user record
UPDATE "users" SET "subscription_plan" = 'starter', "updated_at" = NOW()
WHERE "email" = 'ingakovalski1@gmail.com' AND "subscription_plan" = 'free';
