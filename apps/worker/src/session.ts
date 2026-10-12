import { SessionExpiredError, type SiteSession } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { decryptSession, readSessionFile } from "@jobpilot/sources";
import { config, SESSION_PUBLIC_KEY, sessionPath } from "./config.js";
import type { SourceEntry } from "./sources.js";

/**
 * The user's session on the source, to act under their account. The server's worker takes it from the
 * database and decrypts it in memory: only it has the private key. A worker on the user's machine reads
 * the file `pnpm login:<source>` saved there. Throws SessionExpiredError without one: the user logs in.
 */
export async function loadSession(
   database: DatabaseClient,
   userId: string,
   { adapter }: SourceEntry,
): Promise<SiteSession> {
   if (config.role === "local") {
      const path = sessionPath(userId, adapter.source);
      return readSessionFile(path, adapter.name);
   }

   const encrypted = await database.sourceSessions.getEncryptedSession(userId, adapter.source);
   if (!encrypted) throw new SessionExpiredError(adapter.name); // never logged in
   const keys = { publicKey: SESSION_PUBLIC_KEY, privateKey: config.sessionPrivateKey! };
   try {
      const session = await decryptSession(encrypted, keys);
      return JSON.parse(session) as SiteSession;
   } catch {
      // encrypted for another key pair (the keys were replaced): a new login encrypts it for these
      throw new SessionExpiredError(adapter.name);
   }
}
