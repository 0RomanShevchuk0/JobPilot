import type { JobAttemptChanges, JobAttemptListPage, NewJobAttempt } from "@jobpilot/contracts";
import { normalizeCompanyName } from "@jobpilot/vacancies";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

// rows per page of the tracker: a page fills a screen or two
const PAGE_SIZE = 30;

/** "2026-11-01" at noon UTC: it stays that day in any time zone people look at it from. */
function noonUtc(date: string): Date {
   return new Date(`${date}T12:00:00.000Z`);
}

/** A company's name as written, and normalized to find it by; null when nothing is left of it. */
function companyNamed(name: string): { name: string; normalizedName: string } | null {
   const normalizedName = normalizeCompanyName(name);
   // a name with no letter or digit ("...") normalizes to nothing: no company to link to
   return normalizedName ? { name, normalizedName } : null;
}

@Injectable()
export class JobAttemptsService {
   constructor(private readonly db: Database) {}

   /** A page of my tracker; the next one starts after its last row. */
   async list(userId: string, after: string | undefined): Promise<JobAttemptListPage> {
      // one more than a page: whether another one follows
      const rows = await this.db.jobAttempts.listForUser(userId, { after, limit: PAGE_SIZE + 1 });
      const items = rows.slice(0, PAGE_SIZE);
      const hasMore = rows.length > PAGE_SIZE;
      return { items, nextCursor: hasMore ? items[PAGE_SIZE - 1]!.id : null };
   }

   /** Adds a job JobPilot doesn't know about. */
   create(
      userId: string,
      { company, appliedAt, ...attempt }: NewJobAttempt,
   ): Promise<{ id: string }> {
      return this.db.jobAttempts.create(userId, {
         ...attempt,
         company: company ? (companyNamed(company) ?? undefined) : undefined,
         appliedAt: appliedAt ? noonUtc(appliedAt) : undefined,
      });
   }

   /**
    * Changes a row of mine. A row added by hand keeps a title; only it has a link of its own. False
    * when there is no such row.
    */
   async update(
      userId: string,
      attemptId: string,
      { companyName, appliedAt, ...changes }: JobAttemptChanges,
   ): Promise<boolean> {
      // null as sent: the company isn't known any more
      const company = typeof companyName === "string" ? companyNamed(companyName) : companyName;
      if (companyName && !company) {
         throw new BadRequestException(`"${companyName}" is not a company name`);
      }
      const outcome = await this.db.jobAttempts.update(userId, attemptId, {
         ...changes,
         ...(company !== undefined && { company }),
         ...(appliedAt && { appliedAt: noonUtc(appliedAt) }),
      });
      if (outcome === "title_required") {
         throw new BadRequestException("A job added by hand needs a title");
      }
      if (outcome === "url_not_allowed") {
         throw new BadRequestException(
            "A job from JobPilot has no link of its own: it links to its vacancy",
         );
      }
      return outcome === "updated";
   }

   /** Removes a row of mine; its applications stay sent. False when there is no such row. */
   delete(userId: string, attemptId: string): Promise<boolean> {
      return this.db.jobAttempts.delete(userId, attemptId);
   }
}
