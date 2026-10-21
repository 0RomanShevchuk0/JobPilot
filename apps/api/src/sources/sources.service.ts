import type { ExpiredSession, SiteSession } from "@jobpilot/contracts";
import { encryptSession, SESSION_PUBLIC_KEY } from "@jobpilot/session-crypto";
import { Injectable } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
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
      const json = JSON.stringify(session, null, 2);
      const encrypted = await encryptSession(json, SESSION_PUBLIC_KEY);
      await this.db.sourceSessions.saveSession(userId, source, encrypted);
      await this.saveLocalSessionFile(userId, source, json);
   }

   /**
    * Temporary, goes with the local worker (TODO, the extension's step 6): the session saved for the
    * worker on this machine too, where sessionPath in
    * apps/worker/src/config.ts reads it (the API runs with apps/api as cwd).
    */
   private async saveLocalSessionFile(userId: string, source: string, session: string) {
      const dir = `../../.data/sessions/${userId}`;
      await mkdir(dir, { recursive: true });
      await writeFile(`${dir}/${source}.json`, session, { mode: 0o600 }); // readable by the owner only
   }
}
