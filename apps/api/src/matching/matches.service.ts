import type { MatchListItem } from "@jobpilot/db";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

@Injectable()
export class MatchesService {
   constructor(private readonly db: Database) {}

   list(userId: string, options: { includeSkipped: boolean }): Promise<MatchListItem[]> {
      return this.db.matches.listForUser(userId, options);
   }
}
