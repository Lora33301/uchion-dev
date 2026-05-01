-- 0019: Add referral / ambassador program fields to users table
-- Idempotent: safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" varchar(16);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_ip" varchar(64);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_email_norm" varchar(255);

-- Unique constraint on referral_code (skipped if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_referral_code_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE ("referral_code");
  END IF;
END $$;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS "users_referred_by_idx" ON "users" ("referred_by");
CREATE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users" ("referral_code");
