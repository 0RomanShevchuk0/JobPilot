import type { ExpiredSession, SiteSession } from "@jobpilot/contracts";
import { encryptSession } from "@jobpilot/session-crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Database } from "../infra/database.js";

@Injectable()
export class SourcesService {
   // the worker's pair (SESSION_PRIVATE_KEY): it alone decrypts what is encrypted with this
   private readonly sessionPublicKey: string;

   constructor(
      private readonly db: Database,
      config: ConfigService,
   ) {
      this.sessionPublicKey = config.getOrThrow<string>("SESSION_PUBLIC_KEY");
   }

   /** As the worker found them using the sessions; one that works again drops off by itself. */
   async expiredSessions(userId: string): Promise<ExpiredSession[]> {
      const sessions = await this.db.sourceSessions.listExpired(userId);
      return sessions.map((s) => ({ source: s.source, expiredAt: s.expiredAt.toISOString() }));
   }

   /**
    * Encrypted for the worker, the only one that can read it; no longer marked expired, a new session
    * is taken to work until the worker finds otherwise.
    */
   async saveSession(userId: string, source: string, session: SiteSession): Promise<void> {
      const encrypted = await encryptSession(JSON.stringify(session), this.sessionPublicKey);
      await this.db.sourceSessions.saveSession(userId, source, encrypted);
   }
}
