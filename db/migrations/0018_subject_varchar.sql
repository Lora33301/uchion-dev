-- 0018: Migrate subject from enum to varchar for free-input support
-- Safe for staging (db:push, no enum) and production (has enum)

-- Step 1: Add new varchar columns
ALTER TABLE "worksheets" ADD COLUMN IF NOT EXISTS "subject_v2" varchar(100);
ALTER TABLE "generations" ADD COLUMN IF NOT EXISTS "subject_v2" varchar(100);

-- Step 2: Copy data from old enum columns (IF they exist)
DO $$
BEGIN
  -- worksheets: copy from enum column if it exists and subject_v2 is empty
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worksheets' AND column_name = 'subject'
      AND data_type != 'character varying'
  ) THEN
    UPDATE "worksheets" SET "subject_v2" = "subject"::text WHERE "subject_v2" IS NULL;
    ALTER TABLE "worksheets" DROP COLUMN "subject";
    ALTER TABLE "worksheets" RENAME COLUMN "subject_v2" TO "subject";
  ELSE
    -- subject is already varchar (staging via db:push) — drop the temp column
    ALTER TABLE "worksheets" DROP COLUMN IF EXISTS "subject_v2";
  END IF;

  -- generations: same logic
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generations' AND column_name = 'subject'
      AND data_type != 'character varying'
  ) THEN
    UPDATE "generations" SET "subject_v2" = "subject"::text WHERE "subject_v2" IS NULL;
    ALTER TABLE "generations" DROP COLUMN "subject";
    ALTER TABLE "generations" RENAME COLUMN "subject_v2" TO "subject";
  ELSE
    ALTER TABLE "generations" DROP COLUMN IF EXISTS "subject_v2";
  END IF;
END $$;

-- Step 3: Ensure NOT NULL on worksheets.subject
DO $$
BEGIN
  -- Only alter if column exists and is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worksheets' AND column_name = 'subject' AND is_nullable = 'YES'
  ) THEN
    -- Fill any NULLs first
    UPDATE "worksheets" SET "subject" = 'unknown' WHERE "subject" IS NULL;
    ALTER TABLE "worksheets" ALTER COLUMN "subject" SET NOT NULL;
  END IF;
END $$;

-- Step 4: Ensure varchar type and length on both columns
DO $$
BEGIN
  -- If worksheets.subject is not varchar yet (shouldn't happen after above, but safety)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worksheets' AND column_name = 'subject'
      AND data_type != 'character varying'
  ) THEN
    ALTER TABLE "worksheets" ALTER COLUMN "subject" TYPE varchar(100) USING "subject"::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generations' AND column_name = 'subject'
      AND data_type != 'character varying'
  ) THEN
    ALTER TABLE "generations" ALTER COLUMN "subject" TYPE varchar(100) USING "subject"::text;
  END IF;
END $$;

-- Step 5: Recreate index on worksheets.subject (may have been dropped with column)
DROP INDEX IF EXISTS "worksheets_subject_idx";
CREATE INDEX IF NOT EXISTS "worksheets_subject_idx" ON "worksheets" ("subject");
