import type { JobAttemptChanges, JobAttemptListPage, NewJobAttempt } from "@jobpilot/contracts";
import { normalizeCompanyName } from "@jobpilot/vacancies";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";
import { jobAttemptSilence } from "./job-attempt-silence.js";

// rows per page of the tracker: a page fills a screen or two
const PAGE_SIZE = 30;

@Injectable()
export class JobAttemptsService {
   constructor(private readonly db: Database) {}

   /** A page of my tracker, each row with how silent its company is; the next one starts after its last row. */
   async list(userId: string, after: string | undefined): Promise<JobAttemptListPage> {
      // one more than a page: whether another one follows
      const rows = await this.db.jobAttempts.listForUser(userId, { after, limit: PAGE_SIZE + 1 });
      const now = new Date();
      const items = rows.slice(0, PAGE_SIZE).map(({ progressChangedAt, ...row }) => ({
         ...row,
         silence: jobAttemptSilence({ ...row, progressChangedAt }, now),
      }));
      const hasMore = rows.length > PAGE_SIZE;
      return { items, nextCursor: hasMore ? items[PAGE_SIZE - 1]!.id : null };
   }

   /**
    * Adds a job JobPilot doesn't know about. The date is taken at noon UTC: it stays that day in any
    * time zone people look at it from.
    */
   create(
      userId: string,
      { company, appliedAt, ...attempt }: NewJobAttempt,
   ): Promise<{ id: string }> {
      const normalizedName = company && normalizeCompanyName(company);
      return this.db.jobAttempts.create(userId, {
         ...attempt,
         // a name with no letter or digit ("...") normalizes to nothing: no company to link to
         company: normalizedName ? { name: company!, normalizedName } : undefined,
         appliedAt: appliedAt ? new Date(`${appliedAt}T12:00:00.000Z`) : undefined,
      });
   }

   /** Changes a row of mine. False when there is no such row. */
   update(
      userId: string,
      attemptId: string,
      { companyName, ...changes }: JobAttemptChanges,
   ): Promise<boolean> {
      if (!companyName) return this.db.jobAttempts.update(userId, attemptId, changes);
      const normalizedName = normalizeCompanyName(companyName);
      if (!normalizedName) throw new BadRequestException(`"${companyName}" is not a company name`);
      const company = { name: companyName, normalizedName };
      return this.db.jobAttempts.update(userId, attemptId, { ...changes, company });
   }

   /** Removes a row of mine; its applications stay sent. False when there is no such row. */
   delete(userId: string, attemptId: string): Promise<boolean> {
      return this.db.jobAttempts.delete(userId, attemptId);
   }
}
