import type { JobAttemptSilence, JobAttemptStage, JobAttemptStatus } from "@jobpilot/contracts";

const SILENCE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How the company went quiet on an attempt: active with nothing for 14 days since the stage or status
 * last changed, or since applying when they never did. An offer, a hold and a closed attempt wait for
 * nothing from it.
 */
export function jobAttemptSilence(
   attempt: {
      stage: JobAttemptStage;
      status: JobAttemptStatus;
      appliedAt: string;
      progressChangedAt: string | null;
   },
   now: Date,
): JobAttemptSilence | null {
   if (attempt.status !== "active" || attempt.stage === "offer") return null;
   const quietSince = new Date(attempt.progressChangedAt ?? attempt.appliedAt);
   if (now.getTime() - quietSince.getTime() < SILENCE_DAYS * DAY_MS) return null;
   return attempt.stage === "applied" ? "no_answer" : "ghosted";
}
