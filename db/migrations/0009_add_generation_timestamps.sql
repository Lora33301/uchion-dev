-- Add startedAt and completedAt to generations table for lifecycle tracking
ALTER TABLE generations ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS completed_at timestamptz;
