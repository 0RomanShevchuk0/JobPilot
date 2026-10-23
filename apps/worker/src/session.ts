import { SessionExpiredError, type SiteSession } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { decryptSession } from "@jobpilot/session-crypto";
import { config } from "./config.js";
import { log } from "./log.js";
import type { SourceEntry } from "./sources.js";

/**
 * The user's session on the source, to act under their account: from the database, decrypted in
 * memory, only the worker has the private key. Everything the worker does on a site for a user goes
 * with their session. Throws SessionExpiredError without one: the user logs in.
 */
export async function loadSession(
   database: DatabaseClient,
   userId: string,
   { adapter }: SourceEntry,
): Promise<SiteSession> {
   const encrypted = await database.sourceSessions.getEncryptedSession(userId, adapter.source);
   if (!encrypted) throw new SessionExpiredError(adapter.name); // never logged in
   try {
      const session = await decryptSession(encrypted, config.sessionKeys);
      return JSON.parse(session) as SiteSession;
   } catch {
      // encrypted for another key pair: the keys were replaced, or an API with another
      // SESSION_PUBLIC_KEY saved it to this database. Taken as logged out: a new login encrypts it
      // for these
      log("session", `${adapter.name} session of ${userId} not readable with this SESSION_* pair`);
      throw new SessionExpiredError(adapter.name);
   }
}
