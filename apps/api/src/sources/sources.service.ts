import type { ExpiredSession } from "@jobpilot/contracts";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

@Injectable()
export class SourcesService {
   constructor(private readonly db: Database) {}

   /** As the worker found them using the sessions; one that works again drops off by itself. */
   async expiredSessions(userId: string): Promise<ExpiredSession[]> {
      const sessions = await this.db.sourceSessions.listExpired(userId);
      return sessions.map((s) => ({ source: s.source, expiredAt: s.expiredAt.toISOString() }));
   }
}
