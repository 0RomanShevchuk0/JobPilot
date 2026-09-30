ALTER TABLE "profiles" ADD COLUMN "experience_years" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "salary_target" integer;--> statement-breakpoint
-- skills: jsonb [{ "name": "...", "years": N }] → text[] of names.
-- Postgres can't cast jsonb to text[] and disallows subqueries in ALTER COLUMN ... USING,
-- so the data goes through a new column.
ALTER TABLE "profiles" ADD COLUMN "skills_new" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "profiles" SET "skills_new" = coalesce(
	(SELECT array_agg(coalesce(e->>'name', e #>> '{}')) FROM jsonb_array_elements("skills") e),
	'{}'::text[]
);--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "skills";--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "skills_new" TO "skills";
