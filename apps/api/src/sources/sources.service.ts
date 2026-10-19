import type { ExpiredSession, SiteSession } from "@jobpilot/contracts";
import { encryptSession, SESSION_PUBLIC_KEY } from "@jobpilot/session-crypto";
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

   /**
    * Encrypted for the server's worker, the only one that can read it; no longer marked expired, a new
    * session is taken to work until the worker finds otherwise.
    */
   async saveSession(userId: string, source: string, session: SiteSession): Promise<void> {
      const encrypted = await encryptSession(JSON.stringify(session), SESSION_PUBLIC_KEY);
      await this.db.sourceSessions.saveSession(userId, source, encrypted);
   }
}
