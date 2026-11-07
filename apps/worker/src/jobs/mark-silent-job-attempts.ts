import type { DatabaseClient } from "@jobpilot/db";
import { log } from "../log.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How often the tracker is looked through: a row's status can be up to this late. */
export const MARK_SILENT_EVERY_MS = DAY_MS;
// a company with no word for this long has gone quiet: no_answer or ghosted, as the row's stage says
const QUIET_FOR_MS = 14 * DAY_MS;

/** Gives the tracker rows a company went quiet on their status. */
export async function handleMarkSilentJobAttempts(database: DatabaseClient) {
   const marked = await database.jobAttempts.markSilent(new Date(Date.now() - QUIET_FOR_MS));
   log("mark-silent-job-attempts", `${marked} marked`);
   return marked;
}
