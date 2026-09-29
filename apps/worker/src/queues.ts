import type { JobsOptions } from "bullmq";

/** One queue for discovery of all sources: it is cheap, a few requests per run. */
export const DISCOVER_QUEUE = "discover";

/** One fetch queue per source, so each source gets its own rate limit. */
export const fetchQueueName = (source: string) => `fetch-${source}`;

/** Builds or updates the vacancy of a stored posting. One at a time, so two postings can't race to create the same vacancy. */
export const BUILD_VACANCY_QUEUE = "build-vacancy";

export interface DiscoverJobData {
   source: string;
   keywords: string[];
}

export interface FetchJobData {
   postingId: string;
   // job data is stored as JSON, so the date travels as an ISO string
   ref: { externalId: string; url: string; updatedAt?: string };
}

export interface BuildVacancyJobData {
   postingId: string;
}

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
 * The job id is the posting id: while a build-vacancy job waits, adding another for the same posting
 * is a no-op (the job reads fresh data when it runs anyway). Completed jobs are removed right
 * away so the vacancy can be rebuilt again after the posting's next change.
 */
export const buildVacancyJobOptions = (postingId: string): JobsOptions => ({
   jobId: postingId,
   attempts: 3,
   backoff: { type: "exponential", delay: 10_000 },
   removeOnComplete: true,
   removeOnFail: 1000,
});
