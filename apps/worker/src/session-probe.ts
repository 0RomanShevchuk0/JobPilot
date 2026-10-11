import { SessionExpiredError } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { sessionPath } from "./config.js";
import { findSource } from "./sources.js";

export type ProbeResult = "ok" | "logged out" | "unknown";

/**
 * Tries the source's session on a page of one of its postings still up, as the can-apply check would,
 * and records the outcome for everyone searching there: the session file is one for all of them. Run
 * with every discover, so a session that is over shows in the web without waiting for a new vacancy,
 * and one logged into again stops showing. "unknown" when there is no page to try or it is gone.
 */
export async function probeSession(source: string, database: DatabaseClient): Promise<ProbeResult> {
   const entry = findSource(source);
   if (!entry) throw new Error(`no adapter for source ${source}`);
   const url = await database.postings.getLastSeenActiveUrl(source);
   if (!url) return "unknown";
   const userIds = await database.profiles.listUserIdsWithCategoriesOn(source);

   try {
      const result = await entry.adapter.account.checkJobPage(url, sessionPath(source));
      // a removed job answers before the session is looked at: it says nothing of it
      if (result.status === "gone") return "unknown";
      for (const userId of userIds) await database.sourceSessions.markWorking(userId, source);
      return "ok";
   } catch (err) {
      if (!(err instanceof SessionExpiredError)) throw err;
      for (const userId of userIds) await database.sourceSessions.markExpired(userId, source);
      return "logged out";
   }
}
