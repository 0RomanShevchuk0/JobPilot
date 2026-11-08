-- the salary of a tracker row is the one I asked for when applying: named so, apart from a vacancy's
ALTER TABLE "job_attempts" RENAME COLUMN "salary_amount" TO "requested_salary_amount";--> statement-breakpoint
ALTER TABLE "job_attempts" RENAME COLUMN "salary_currency" TO "requested_salary_currency";--> statement-breakpoint
ALTER TABLE "job_attempts" RENAME COLUMN "salary_period" TO "requested_salary_period";--> statement-breakpoint
ALTER TABLE "job_attempts" RENAME CONSTRAINT "job_attempts_salary_complete" TO "job_attempts_requested_salary_complete";
