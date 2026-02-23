-- Fix subscription that was saved as 'free' instead of 'starter' due to webhook plan resolution bug
UPDATE "subscriptions" SET "plan" = 'starter', "generations_per_period" = 25, "updated_at" = NOW()
WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "email" = 'ingakovalski1@gmail.com')
  AND "plan" = 'free' AND "status" = 'active';

-- Also update the user's subscription_plan field
UPDATE "users" SET "subscription_plan" = 'starter', "updated_at" = NOW()
WHERE "email" = 'ingakovalski1@gmail.com' AND "subscription_plan" = 'free';
