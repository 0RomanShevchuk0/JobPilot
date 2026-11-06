import type { JobAttemptChanges, JobAttemptListPage } from "@jobpilot/contracts";
import { Injectable } from "@nestjs/common";
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

   /** Changes a row of mine. False when there is no such row. */
   update(userId: string, attemptId: string, changes: JobAttemptChanges): Promise<boolean> {
      return this.db.jobAttempts.update(userId, attemptId, changes);
   }
}
