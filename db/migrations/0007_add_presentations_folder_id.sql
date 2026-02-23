-- Add folder support to presentations
ALTER TABLE "presentations" ADD COLUMN IF NOT EXISTS "folder_id" uuid;
DO $$ BEGIN
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "presentations_folder_id_idx" ON "presentations" ("folder_id");
