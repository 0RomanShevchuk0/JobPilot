import type { ExpiredSession, SiteSession } from "@jobpilot/contracts";
import { encryptSession, SESSION_PUBLIC_KEY } from "@jobpilot/session-crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, writeFile } from "node:fs/promises";
import { Database } from "../infra/database.js";

@Injectable()
export class SourcesService {
   // a local worker reads the sessions from files the API saves (the default, as for the worker); the
   // server's reads them from the database, decrypting them itself
   private readonly forLocalWorker: boolean;

   constructor(
      private readonly db: Database,
      config: ConfigService,
   ) {
      this.forLocalWorker = (config.get<string>("WORKER_ROLE") || "local") === "local";
   }

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
      if (this.forLocalWorker) await this.saveLocalSessionFile(userId, source, json);
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
