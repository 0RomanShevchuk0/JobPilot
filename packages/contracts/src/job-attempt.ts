import { z } from "zod";

/** How far an attempt got, in the order they usually go; the order isn't enforced. */
export const jobAttemptStages = [
   "applied",
   "hr",
   "tech_interview",
   "test_task",
   "final",
   "offer",
] as const;
export type JobAttemptStage = (typeof jobAttemptStages)[number];

export const jobAttemptStatuses = ["active", "hold", "rejected", "withdrew", "accepted"] as const;
export type JobAttemptStatus = (typeof jobAttemptStatuses)[number];

/**
 * How the company went quiet on an active attempt. no_answer: nothing since I applied. ghosted: it
 * stopped answering after the process began.
 */
export type JobAttemptSilence = "no_answer" | "ghosted";

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
   /** the vacancy's title */
   title: string | null;
   /** the employer; null when it isn't known */
   company: string | null;
   stage: JobAttemptStage;
   status: JobAttemptStatus;
   notes: string;
   appliedAt: string;
   /** worked out from the dates when read; null when the company isn't silent */
   silence: JobAttemptSilence | null;
   /** the earliest sent first */
   applications: JobAttemptApplication[];
}

/** A page of GET /job-attempts; the next one is asked for with after=nextCursor. */
export interface JobAttemptListPage {
   items: JobAttemptListItem[];
   /** null on the last page */
   nextCursor: string | null;
}

/** What PATCH /job-attempts/:id changes: at least one of them. */
export const jobAttemptChangesSchema = z
   .object({
      stage: z.enum(jobAttemptStages),
      status: z.enum(jobAttemptStatuses),
      notes: z.string().max(10_000),
   })
   .partial()
   .refine((changes) => Object.keys(changes).length > 0, "Nothing to change");
export type JobAttemptChanges = z.infer<typeof jobAttemptChangesSchema>;
