-- Composite indexes for common query patterns (P1-13)
-- These cover WHERE userId = ? AND deletedAt IS NULL ORDER BY createdAt DESC

CREATE INDEX IF NOT EXISTS "worksheets_user_active_idx" ON "worksheets" ("user_id", "deleted_at", "created_at");
CREATE INDEX IF NOT EXISTS "folders_user_active_idx" ON "folders" ("user_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "presentations_user_created_idx" ON "presentations" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "generations_user_created_idx" ON "generations" ("user_id", "created_at");
