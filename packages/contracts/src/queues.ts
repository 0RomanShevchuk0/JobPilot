// Every queue of the system and the data its jobs carry, in pipeline order:
//
//   discover → fetch-<source> → build-vacancy → match-vacancy → check-can-apply → score-vacancy
//                                                  ↑
//   match-user (profile changed) ──────────────────┘
//
//   prepare-application (the user asked to apply): read the form on the job site, answer it
//   fill-application (the user approved the answers): fill the form in a visible browser, they send it
//
// How jobs are retried and kept (BullMQ options) is the worker's business and lives there.

/** Queues with a fixed name. */
export const QueueNames = {
   /** Finds new and bumped postings on a source. One queue for all sources: a few requests per run. */
   discover: "discover",
   /** Builds or updates the vacancy of a stored posting. */
   buildVacancy: "build-vacancy",
   /** Evaluates one vacancy for one user with the prefilter; what passes goes to check-can-apply. */
   matchVacancy: "match-vacancy",
   /**
    * Asks the job site whether the user can apply to a prefiltered vacancy (its job page with their
    * session): what they can't is dropped, the rest goes to score-vacancy. Rate-limited: the requests
    * are the user's.
    */
   checkCanApply: "check-can-apply",
   /** Scores one prefiltered vacancy for one user with an LLM. Rate-limited by the provider. */
   scoreVacancy: "score-vacancy",
   /** Opens an application form on the job site and answers it with an LLM. Added by the API. */
   prepareApplication: "prepare-application",
   /** Fills a prepared application into the form in a visible browser; the user sends it. Added by the API. */
   fillApplication: "fill-application",
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

export interface CheckCanApplyJobData {
   userId: string;
   vacancyId: string;
}

export interface ScoreVacancyJobData {
   userId: string;
   vacancyId: string;
}

export interface PrepareApplicationJobData {
   applicationId: string;
   /** read the form on the job site again instead of reusing the questions read before */
   refreshForm?: boolean;
}

export interface FillApplicationJobData {
   applicationId: string;
}

export interface MatchUserJobData {
   userId: string;
}
