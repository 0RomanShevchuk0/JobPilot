// Every queue of the system and the data its jobs carry, in pipeline order:
//
//   discover → fetch-<source> → build-vacancy → match-vacancy → score-vacancy
//                                                  ↑
//   match-user (profile changed) ──────────────────┘
//
//   prepare-application (the user asked to apply): read the form on the job site, answer it
//
// How jobs are retried and kept (BullMQ options) is the worker's business and lives there.

/** Queues with a fixed name. */
export const QueueNames = {
   /** Finds new and bumped postings on a source. One queue for all sources: a few requests per run. */
   discover: "discover",
   /** Builds or updates the vacancy of a stored posting. */
   buildVacancy: "build-vacancy",
   /** Evaluates one vacancy for one user with the prefilter; what passes goes to score-vacancy. */
   matchVacancy: "match-vacancy",
   /** Scores one prefiltered vacancy for one user with an LLM. Rate-limited by the provider. */
   scoreVacancy: "score-vacancy",
   /** Opens an application form on the job site and answers it with an LLM. Added by the API. */
   prepareApplication: "prepare-application",
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

export interface ScoreVacancyJobData {
   userId: string;
   vacancyId: string;
}

export interface PrepareApplicationJobData {
   applicationId: string;
}

export interface MatchUserJobData {
   userId: string;
}
