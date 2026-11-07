import { z } from "zod";

/**
 * How far an attempt got, in the order they usually go; the order isn't enforced. replied: the company
 * answered, with no interview (yet): that and everything after it counts as having got an answer.
 */
export const jobAttemptStages = [
   "applied",
   "replied",
   "hr",
   "tech_interview",
   "test_task",
   "final",
   "offer",
] as const;
export type JobAttemptStage = (typeof jobAttemptStages)[number];

/**
 * How an attempt stands. no_answer: nothing since I applied. ghosted: the company stopped answering
 * after the process began. The worker sets these two on an active attempt quiet for long enough; like
 * the others, they can also be picked by hand.
 */
export const jobAttemptStatuses = [
   "active",
   "no_answer",
   "ghosted",
   "hold",
   "rejected",
   "declined",
   "accepted",
] as const;
export type JobAttemptStatus = (typeof jobAttemptStatuses)[number];

/** An application of an attempt: the way to its answers. */
export interface JobAttemptApplication {
   id: string;
   /** the job site's name, e.g. "Djinni" */
   sourceName: string;
}

/** A row of the tracker in GET /job-attempts. The API's wire format: ISO dates. */
export interface JobAttemptListItem {
   id: string;
   vacancyId: string | null;
   /** the job's title: the vacancy's, or what I wrote on a row added by hand */
   title: string | null;
   /** the employer; null when it isn't known */
   company: string | null;
   /** the job's page, on a row added by hand */
   url: string | null;
   stage: JobAttemptStage;
   status: JobAttemptStatus;
   notes: string;
   appliedAt: string;
   /** the earliest sent first */
   applications: JobAttemptApplication[];
}

/** A page of GET /job-attempts; the next one is asked for with after=nextCursor. */
export interface JobAttemptListPage {
   items: JobAttemptListItem[];
   /** null on the last page */
   nextCursor: string | null;
}

/** A row added by hand in POST /job-attempts: a job JobPilot doesn't know about. */
export const newJobAttemptSchema = z.object({
   title: z.string().trim().min(1).max(200),
   company: z.string().trim().min(1).max(200).optional(),
   // web pages only: "https://x.com", not "javascript:alert(1)", which a link would run
   url: z
      .url({ protocol: /^https?$/ })
      .max(2000)
      .optional(),
   /** "2026-11-01"; absent = now */
   appliedAt: z.iso.date().optional(),
   /** an attempt already under way goes in as it stands; absent = just applied */
   stage: z.enum(jobAttemptStages).optional(),
   status: z.enum(jobAttemptStatuses).optional(),
   notes: z.string().max(10_000).optional(),
});
export type NewJobAttempt = z.infer<typeof newJobAttemptSchema>;

/** What PATCH /job-attempts/:id changes: at least one of them. */
export const jobAttemptChangesSchema = z
   .object({
      stage: z.enum(jobAttemptStages),
      status: z.enum(jobAttemptStatuses),
      notes: z.string().max(10_000),
      /** on a row with no company; a company it already has stays */
      companyName: z.string().trim().min(1).max(200),
   })
   .partial()
   .refine((changes) => Object.keys(changes).length > 0, "Nothing to change");
export type JobAttemptChanges = z.infer<typeof jobAttemptChangesSchema>;
