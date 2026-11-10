DROP INDEX "vacancies_fingerprint_idx";--> statement-breakpoint
CREATE INDEX "vacancies_company_id_idx" ON "vacancies" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "vacancies" DROP COLUMN "fingerprint";