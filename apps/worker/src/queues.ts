import type { JobsOptions } from "bullmq";

// How the worker retries and keeps jobs of each queue. Queue names and job data: @jobpilot/contracts.

export const discoverJobOptions: JobsOptions = {
   attempts: 2,
   backoff: { type: "exponential", delay: 60_000 },
   removeOnComplete: 100,
   removeOnFail: 500,
};

export const fetchJobOptions: JobsOptions = {
   attempts: 3,
   backoff: { type: "exponential", delay: 30_000 },
   removeOnComplete: 1000,
   removeOnFail: 5000,
};

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
