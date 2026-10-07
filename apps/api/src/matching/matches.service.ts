import type { MatchDetails, MatchListItem, MatchStatus } from "@jobpilot/contracts";
import type { MatchListOptions } from "@jobpilot/db";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

@Injectable()
export class MatchesService {
   constructor(private readonly db: Database) {}

   list(userId: string, options: MatchListOptions): Promise<MatchListItem[]> {
      return this.db.matches.listForUser(userId, options);
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
