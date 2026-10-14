import { SessionExpiredError } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { canUseSessionOf, loadSession } from "./session.js";
import { findSource } from "./sources.js";

export type ProbeResult = "ok" | "logged out" | "unknown";

/**
 * Tries the session of everyone searching on the source whose session this worker can use (see
 * canUseSessionOf), each their own, on a page of one of its postings still up, as the can-apply check
 * would, and records how it went for them. Run with every discover, so a session that is over shows in
 * the web without waiting for a new vacancy, and one logged into again stops showing. A user without a
 * session is logged out with no request made.
 */
export async function probeSessions(
   source: string,
   database: DatabaseClient,
): Promise<{ userId: string; result: ProbeResult }[]> {
   const entry = findSource(source);
   if (!entry) throw new Error(`no adapter for source ${source}`);
   const url = await database.postings.getLastSeenActiveUrl(source);
   if (!url) return [];

   const results = [];
   const userIds = await database.profiles.listUserIdsWithCategoriesOn(source);
   for (const userId of userIds) {
      if (!(await canUseSessionOf(database, userId))) continue;
      results.push({ userId, result: await probeSession(source, url, userId, database) });
   }
   return results;
}

async function probeSession(
   source: string,
   url: string,
   userId: string,
   database: DatabaseClient,
): Promise<ProbeResult> {
   const entry = findSource(source)!;
   try {
      const session = await loadSession(database, userId, entry);
      const result = await entry.adapter.account.checkJobPage(url, session);
      // a removed job answers before the session is looked at: it says nothing of it
      if (result.status === "gone") return "unknown";
      await database.sourceSessions.markWorking(userId, source);
      return "ok";
   } catch (err) {
      if (!(err instanceof SessionExpiredError)) throw err;
      await database.sourceSessions.markExpired(userId, source);
      return "logged out";
   }
}
