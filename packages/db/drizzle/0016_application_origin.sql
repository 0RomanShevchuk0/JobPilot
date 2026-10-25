ALTER TABLE "applications" ADD COLUMN "origin" text DEFAULT 'jobpilot' NOT NULL;--> statement-breakpoint
-- applying moved from the vacancy to its postings: a vacancy marked applied counts as applied through
-- every posting it has, at the time it was marked. A posting without an application gets one marked
-- by hand; one with an application not sent yet has it marked sent; a sent one stays as it is
INSERT INTO "applications" ("user_id", "posting_id", "status", "origin", "submitted_at", "created_at", "updated_at")
SELECT "vm"."user_id", "p"."id", 'submitted', 'manual', "marked"."at", "marked"."at", "marked"."at"
FROM "vacancy_matches" AS "vm"
INNER JOIN "postings" AS "p" ON "p"."vacancy_id" = "vm"."vacancy_id"
CROSS JOIN LATERAL (SELECT coalesce("vm"."status_changed_at", "vm"."evaluated_at") AS "at") AS "marked"
WHERE "vm"."status" = 'applied'
ON CONFLICT ("user_id", "posting_id") DO UPDATE
SET "status" = 'submitted', "origin" = 'manual', "submitted_at" = excluded."submitted_at", "failure_reason" = NULL,
	"updated_at" = excluded."updated_at"
WHERE "applications"."status" <> 'submitted';
--> statement-breakpoint
-- the vacancy keeps only being hidden
UPDATE "vacancy_matches" SET "status" = NULL, "status_changed_at" = NULL WHERE "status" = 'applied';
