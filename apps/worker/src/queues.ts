import type { JobsOptions } from "bullmq";

// How the worker retries and keeps jobs of each queue. Queue names and job data: @jobpilot/contracts.

export const discoverJobOptions: JobsOptions = {
   attempts: 2,
   backoff: { type: "exponential", delay: 60_000 },
   removeOnComplete: 100,
   removeOnFail: 500,
};

export const detectClosedPostingsJobOptions: JobsOptions = {
   attempts: 2,
   backoff: { type: "exponential", delay: 60_000 },
   removeOnComplete: 100,
   removeOnFail: 500,
};

export const probeSessionsJobOptions: JobsOptions = {
   attempts: 2,
   backoff: { type: "exponential", delay: 60_000 },
   removeOnComplete: 100,
   removeOnFail: 500,
};

export const markSilentJobAttemptsJobOptions: JobsOptions = {
   attempts: 2,
   backoff: { type: "exponential", delay: 60_000 },
   removeOnComplete: 100,
   removeOnFail: 500,
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
// the pauses before a fetch's next attempts: a page DOU isn't ready to show yet reads fine minutes
// later (one published moments ago); a site down for hours, the next day
const FETCH_RETRY_DELAYS_MS = [5 * MINUTE_MS, 15 * MINUTE_MS, HOUR_MS, 6 * HOUR_MS, 24 * HOUR_MS];

export const fetchJobOptions: JobsOptions = {
   attempts: FETCH_RETRY_DELAYS_MS.length + 1,
   // the fetch worker's backoffStrategy: fetchRetryDelayMs
   backoff: { type: "custom" },
   removeOnComplete: 1000,
   removeOnFail: 5000,
};

/** How long a fetch waits before its next attempt, by how many it has made. */
export function fetchRetryDelayMs(attemptsMade: number): number {
   return FETCH_RETRY_DELAYS_MS[attemptsMade - 1] ?? FETCH_RETRY_DELAYS_MS.at(-1)!;
}

/**
 * One pending build per posting: adding it again while it waits is a no-op (it reads fresh data when
 * it runs anyway); while it runs, one more build is queued for after it. Once it finishes — completed
 * or failed — it can be queued again, so a failure never blocks later rebuilds.
 */
export const buildVacancyJobOptions = (postingId: string): JobsOptions => ({
   deduplication: { id: postingId, keepLastIfActive: true },
   attempts: 3,
   backoff: { type: "exponential", delay: 10_000 },
   removeOnComplete: 1000,
   removeOnFail: 1000,
});

/** Same as build-vacancy: one pending evaluation per user and vacancy. */
export const matchVacancyJobOptions = (userId: string, vacancyId: string): JobsOptions => ({
   deduplication: { id: `${userId}_${vacancyId}`, keepLastIfActive: true },
   attempts: 3,
   backoff: { type: "exponential", delay: 10_000 },
   removeOnComplete: 1000,
   removeOnFail: 1000,
});

/** One pending can-apply check per user and vacancy, like match-vacancy. */
export const checkCanApplyJobOptions = (userId: string, vacancyId: string): JobsOptions => ({
   deduplication: { id: `${userId}_${vacancyId}`, keepLastIfActive: true },
   attempts: 3,
   backoff: { type: "exponential", delay: 30_000 },
   removeOnComplete: 1000,
   removeOnFail: 1000,
});

/**
 * One pending scoring per user and vacancy, like match-vacancy. The backoff is long: a failure is
 * usually the provider's rate limit or an outage, not something a quick retry fixes.
 */
export const scoreVacancyJobOptions = (userId: string, vacancyId: string): JobsOptions => ({
   deduplication: { id: `${userId}_${vacancyId}`, keepLastIfActive: true },
   attempts: 3,
   backoff: { type: "exponential", delay: 60_000 },
   removeOnComplete: 1000,
   removeOnFail: 1000,
});
