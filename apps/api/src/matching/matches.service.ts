import type { AppliedVacancy, MatchDetails, MatchListPage, MatchStatus } from "@jobpilot/contracts";
import type { MatchListOptions } from "@jobpilot/db";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

// vacancies per page of the list: a screen or two of cards
const PAGE_SIZE = 20;

@Injectable()
export class MatchesService {
   constructor(private readonly db: Database) {}

   /** A page of the list; the next one starts after its last vacancy. */
   async list(userId: string, options: Omit<MatchListOptions, "limit">): Promise<MatchListPage> {
      // one more than a page: whether another one follows
      const items = await this.db.matches.listForUser(userId, { ...options, limit: PAGE_SIZE + 1 });
      const page = items.slice(0, PAGE_SIZE);
      const hasMore = items.length > PAGE_SIZE;
      return { items: page, nextCursor: hasMore ? page[PAGE_SIZE - 1]!.vacancyId : null };
   }

   /** Everything I applied to, the latest first. */
   listApplied(userId: string): Promise<AppliedVacancy[]> {
      return this.db.matches.listApplied(userId);
   }

   /** Undefined when the vacancy has no evaluation for the user's current profile. */
   get(userId: string, vacancyId: string): Promise<MatchDetails | undefined> {
      return this.db.matches.getDetails(userId, vacancyId);
   }

   /** Returns false when the vacancy has no evaluation for the user. */
   setStatus(userId: string, vacancyId: string, status: MatchStatus): Promise<boolean> {
      return this.db.matches.setStatus(userId, vacancyId, status);
   }
}
