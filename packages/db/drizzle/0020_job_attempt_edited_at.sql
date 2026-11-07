ALTER TABLE "job_attempts" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
-- Undo read notes as something of mine in a row; edited_at says it from now on, so the rows with
-- notes get it too, or Undo would take them away unasked
UPDATE "job_attempts" SET "edited_at" = now() WHERE "notes" <> '';
