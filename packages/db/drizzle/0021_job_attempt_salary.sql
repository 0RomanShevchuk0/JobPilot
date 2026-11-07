ALTER TABLE "job_attempts" ADD COLUMN "salary_amount" integer;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD COLUMN "salary_currency" text;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD COLUMN "salary_period" text;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_salary_complete" CHECK (num_nulls("job_attempts"."salary_amount", "job_attempts"."salary_currency", "job_attempts"."salary_period") in (0, 3));--> statement-breakpoint
-- the rows from JobPilot start with the profile's target salary from now on: the ones so far get
-- today's, the closest there is. Rows added by hand stay without one; edited_at stays as it is
UPDATE "job_attempts" AS "ja"
SET "salary_amount" = "p"."salary_target", "salary_currency" = "p"."salary_currency",
	"salary_period" = "p"."salary_period"
FROM "profiles" AS "p"
WHERE "p"."user_id" = "ja"."user_id" AND "ja"."vacancy_id" IS NOT NULL AND "ja"."salary_amount" IS NULL
	AND "p"."salary_target" IS NOT NULL AND "p"."salary_currency" IS NOT NULL AND "p"."salary_period" IS NOT NULL;
