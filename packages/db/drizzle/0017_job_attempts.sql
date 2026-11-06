CREATE TABLE "job_attempts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"vacancy_id" uuid,
	"company_id" uuid,
	"stage" text DEFAULT 'applied' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"progress_changed_at" timestamp with time zone,
	CONSTRAINT "job_attempts_user_vacancy_uq" UNIQUE("user_id","vacancy_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_attempt_id_job_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."job_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- the applications sent so far: one attempt per vacancy, applied when the first one went out
INSERT INTO "job_attempts" ("user_id", "vacancy_id", "company_id", "applied_at")
SELECT "a"."user_id", "v"."id", "v"."company_id", min("a"."submitted_at")
FROM "applications" AS "a"
INNER JOIN "postings" AS "p" ON "p"."id" = "a"."posting_id"
INNER JOIN "vacancies" AS "v" ON "v"."id" = "p"."vacancy_id"
WHERE "a"."status" = 'submitted'
GROUP BY "a"."user_id", "v"."id", "v"."company_id";
--> statement-breakpoint
UPDATE "applications" AS "a" SET "attempt_id" = "ja"."id"
FROM "postings" AS "p", "job_attempts" AS "ja"
WHERE "p"."id" = "a"."posting_id" AND "ja"."vacancy_id" = "p"."vacancy_id" AND "ja"."user_id" = "a"."user_id"
	AND "a"."status" = 'submitted';
