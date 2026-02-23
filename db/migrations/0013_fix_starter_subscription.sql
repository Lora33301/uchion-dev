-- Convert subscription_plan from enum to varchar if it's still an enum
-- (migration 0010 tried ADD COLUMN IF NOT EXISTS but old enum column already existed)
DO $$ BEGIN
  ALTER TABLE "users" ALTER COLUMN "subscription_plan" TYPE varchar(20) USING "subscription_plan"::text;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix subscription that was saved as 'free' instead of 'starter' due to webhook plan resolution bug
UPDATE "subscriptions" SET "plan_v2" = 'starter', "generations_per_period" = 25, "updated_at" = NOW()
WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "email" = 'ingakovalski1@gmail.com')
  AND "plan_v2" = 'free' AND "status_v2" = 'active';

-- Also update the user's subscription_plan field
UPDATE "users" SET "subscription_plan" = 'starter', "updated_at" = NOW()
WHERE "email" = 'ingakovalski1@gmail.com' AND "subscription_plan" = 'free';
