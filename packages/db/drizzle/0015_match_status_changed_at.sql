ALTER TABLE "vacancy_matches" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
-- the marks made before: an applied vacancy at its latest application sent through JobPilot; one marked
-- by hand, and a hidden one, at its evaluation (the closest date there is)
UPDATE "vacancy_matches" AS "vm" SET "status_changed_at" = coalesce(
	(
		SELECT max("a"."updated_at")
		FROM "applications" AS "a"
		INNER JOIN "postings" AS "p" ON "p"."id" = "a"."posting_id"
		WHERE "a"."user_id" = "vm"."user_id" AND "p"."vacancy_id" = "vm"."vacancy_id" AND "a"."status" = 'submitted'
	),
	"vm"."evaluated_at"
)
WHERE "vm"."status" IS NOT NULL;
