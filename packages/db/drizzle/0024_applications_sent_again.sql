ALTER TABLE "applications" DROP CONSTRAINT "applications_user_posting_uq";--> statement-breakpoint
ALTER TABLE "job_attempts" DROP CONSTRAINT "job_attempts_user_vacancy_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_posting_unsent_uq" ON "applications" USING btree ("user_id","posting_id") WHERE "applications"."status" <> 'submitted';--> statement-breakpoint
CREATE INDEX "job_attempts_user_vacancy_idx" ON "job_attempts" USING btree ("user_id","vacancy_id");