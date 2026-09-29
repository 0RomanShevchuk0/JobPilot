import type { JobsOptions } from "bullmq";

/** One queue for discovery of all sources: it is cheap, a few requests per run. */
export const DISCOVER_QUEUE = "discover";

/** One fetch queue per source, so each source gets its own rate limit. */
export const fetchQueueName = (source: string) => `fetch-${source}`;

export interface DiscoverJobData {
   source: string;
   keywords: string[];
}

export interface FetchJobData {
   postingId: string;
   // job data is stored as JSON, so the date travels as an ISO string
   ref: { externalId: string; url: string; updatedAt?: string };
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
