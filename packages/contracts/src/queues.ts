// Every queue of the system and the data its jobs carry, in pipeline order:
//
//   discover → fetch-<source> → build-vacancy → match-vacancy
//                                                  ↑
//   match-user (profile changed) ──────────────────┘
//
// How jobs are retried and kept (BullMQ options) is the worker's business and lives there.

/** Queues with a fixed name. */
export const QueueNames = {
   /** Finds new and bumped postings on a source. One queue for all sources: a few requests per run. */
   discover: "discover",
   /** Builds or updates the vacancy of a stored posting. */
   buildVacancy: "build-vacancy",
   /** Evaluates one vacancy for one user. */
   matchVacancy: "match-vacancy",
   /** Re-evaluates every open vacancy for a user, e.g. after their profile changed. Added by the API. */
   matchUser: "match-user",
} as const;

/** Fetches and parses posting pages. One queue per source, so each source gets its own rate limit. */
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

export interface BuildVacancyJobData {
   postingId: string;
}

export interface MatchVacancyJobData {
   userId: string;
   vacancyId: string;
}

export interface MatchUserJobData {
   userId: string;
}
