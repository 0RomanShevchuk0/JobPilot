import type { ProbeSessionsJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import type { Job } from "bullmq";
import { log } from "../log.js";
import { probeSessions } from "../session-probe.js";

/**
 * How often each user's session on a source is tried. Every probe is a request from their account, so
 * not tied to how often vacancies are looked for: that one is anonymous and may run far more often.
 */
export const PROBE_SESSIONS_EVERY_MS = 3 * 60 * 60 * 1000;

/** Each searching user's session on the source → one job page with it → working or expired. */
export async function handleProbeSessions(
   job: Job<ProbeSessionsJobData>,
   database: DatabaseClient,
) {
   const { source } = job.data;
   const results = await probeSessions(source, database);
   const summary = results.map((r) => r.result).join(", ") || "none to try";
   log("probe-sessions", `${source}: ${summary}`);
   return results;
}
