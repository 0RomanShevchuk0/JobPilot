import type {
   ApplicationListItem,
   ApplicationListTab,
   ApplicationStatus,
   FormField,
} from "@jobpilot/contracts";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, postings, sources, vacancies, vacancyMatches } from "../schema.js";
import { externalApplyUrl } from "./matches.js";

/** An application with its answers, as stored. */
export interface StoredApplication extends ApplicationListItem {
   fields: FormField[];
}

/** What the worker needs to prepare an application. */
export interface ApplicationToPrepare {
   userId: string;
   status: ApplicationStatus;
   /** the job page to open */
   postingUrl: string;
   source: string;
   vacancyId: string | null;
   /** what was read and answered before; empty until the form is read for the first time */
   fields: FormField[];
}

/** What the worker needs to fill an application into the form. */
export type ApplicationToFill = ApplicationToPrepare;

export interface ApplicationListOptions {
   tab: ApplicationListTab;
   /** the last application of the previous page: the list goes on after it; absent = from the top */
   after?: string;
   limit: number;
}

export interface ApplicationsRepository {
   /**
    * The posting to apply through, if it exists and is still on its job site: whether that site sends
    * applicants to the employer's site instead (externalApplyUrl).
    */
   getPostingToApply(postingId: string): Promise<{ externalApplyUrl: string | null } | undefined>;
   /**
    * Starts preparing the application to a posting: a new one, or the existing one again (its fields
    * stay until new answers replace them). Returns undefined when it was already submitted.
    */
   startPreparing(userId: string, postingId: string): Promise<{ id: string } | undefined>;
   /**
    * My applications in one of the lists, a page at a time: in progress the latest activity first,
    * sent the latest sent first.
    */
   listForUser(userId: string, options: ApplicationListOptions): Promise<ApplicationListItem[]>;
   get(userId: string, applicationId: string): Promise<StoredApplication | undefined>;
   getToPrepare(applicationId: string): Promise<ApplicationToPrepare | undefined>;
   /** The form was read and answered: ready for the user to review. */
   setPrepared(applicationId: string, fields: FormField[]): Promise<void>;
   setFailed(applicationId: string, reason: string): Promise<void>;
   /** The job site takes no application to this job through JobPilot; reason says why. */
   setCannotApply(applicationId: string, reason: string): Promise<void>;
   getToFill(applicationId: string): Promise<ApplicationToFill | undefined>;
   /** The user sent the form. */
   setSubmitted(applicationId: string): Promise<void>;
   /**
    * I applied through the posting myself (on the employer's site it sends to, or the job site) and
    * mark it sent: a new application, or the one JobPilot was preparing. Returns its id.
    */
   markSentByHand(userId: string, postingId: string): Promise<{ id: string }>;
   /**
    * Takes back an application I marked sent by hand: one JobPilot had answered is ready for review
    * again, with its answers; one with no form is gone. False when there is no such one of mine.
    */
   unmarkSentByHand(userId: string, applicationId: string): Promise<boolean>;
   /** Filling went wrong: the answers stay ready for review, the reason is shown with them. */
   setFillProblem(applicationId: string, reason: string): Promise<void>;
   /** Forgets the last filling's problem: a new one is starting. */
   clearFillProblem(applicationId: string): Promise<void>;
   /** Replaces the answers while they are up for review; false when the application no longer is. */
   saveFields(applicationId: string, fields: FormField[]): Promise<boolean>;
}

// what the user sees of an application, its answers aside
const listColumns = {
   id: applications.id,
   vacancyId: postings.vacancyId,
   title: vacancies.title,
   postingId: applications.postingId,
   postingUrl: postings.url,
   sourceName: sources.name,
   status: applications.status,
   origin: applications.origin,
   failureReason: applications.failureReason,
   vacancyStatus: vacancyMatches.status,
   submittedAt: applications.submittedAt,
   createdAt: applications.createdAt,
   updatedAt: applications.updatedAt,
};

// the worker finishing a preparation leaves alone one I marked sent by hand meanwhile
const notSentSql = ne(applications.status, "submitted");

// what the in-progress list holds: something can still be done with it
const inWorkStatuses: ApplicationStatus[] = ["draft", "preparing", "ready_for_review", "failed"];

// the user's evaluation of the application's vacancy: whether they hid it
const vacancyOfApplicationSql = and(
   eq(vacancyMatches.userId, applications.userId),
   eq(vacancyMatches.vacancyId, postings.vacancyId),
);

function withIsoDates<T extends { submittedAt: Date | null; createdAt: Date; updatedAt: Date }>(
   row: T,
) {
   return {
      ...row,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
   };
}

export function createApplicationsRepository(db: Drizzle): ApplicationsRepository {
   return {
      async getPostingToApply(postingId) {
         const [row] = await db
            .select({ parsed: postings.parsed })
            .from(postings)
            .where(and(eq(postings.id, postingId), isNull(postings.goneAt)));
         return row && { externalApplyUrl: externalApplyUrl(row.parsed?.apply ?? null) };
      },

      async startPreparing(userId, postingId) {
         const [row] = await db
            .insert(applications)
            .values({ userId, postingId, status: "preparing" })
            .onConflictDoUpdate({
               target: [applications.userId, applications.postingId],
               // the fields stay: the new answers replace them, or the questions are reused
               set: { status: "preparing", failureReason: null, updatedAt: sql`now()` },
               setWhere: ne(applications.status, "submitted"),
            })
            .returning({ id: applications.id });
         return row;
      },

      async listForUser(userId, { tab, after, limit }) {
         // a sent one always has its date
         const sortedAt = tab === "sent" ? applications.submittedAt : applications.updatedAt;
         const lastShownSortedAt =
            tab === "sent" ? sql`last_shown.submitted_at` : sql`last_shown.updated_at`;
         // the next page: what comes below the last application shown. (a, b) < (x, y) compares like
         // words: b only when a ties. Its values are read from the table, not sent by the client: JS
         // dates would drop microseconds
         const belowLastShown = sql`
            (${sortedAt}, ${applications.id}) < (
               select ${lastShownSortedAt}, last_shown.id
               from applications last_shown
               where last_shown.user_id = ${userId} and last_shown.id = ${after}
            )`;
         const rows = await db
            .select(listColumns)
            .from(applications)
            .innerJoin(postings, eq(postings.id, applications.postingId))
            .leftJoin(vacancies, eq(vacancies.id, postings.vacancyId))
            .innerJoin(sources, eq(sources.id, postings.sourceId))
            .leftJoin(vacancyMatches, vacancyOfApplicationSql)
            .where(
               and(
                  eq(applications.userId, userId),
                  tab === "sent"
                     ? eq(applications.status, "submitted")
                     : // once I hide its vacancy, I'm done with it
                       and(
                          inArray(applications.status, inWorkStatuses),
                          isNull(vacancyMatches.status),
                       ),
                  after ? belowLastShown : undefined,
               ),
            )
            .orderBy(desc(sortedAt), desc(applications.id))
            .limit(limit);
         return rows.map(withIsoDates);
      },

      async get(userId, applicationId) {
         const [row] = await db
            .select({ ...listColumns, fields: applications.formFields })
            .from(applications)
            .innerJoin(postings, eq(postings.id, applications.postingId))
            .leftJoin(vacancies, eq(vacancies.id, postings.vacancyId))
            .innerJoin(sources, eq(sources.id, postings.sourceId))
            .leftJoin(vacancyMatches, vacancyOfApplicationSql)
            .where(and(eq(applications.userId, userId), eq(applications.id, applicationId)));
         return row && withIsoDates(row);
      },

      async getToPrepare(applicationId) {
         const [row] = await db
            .select({
               userId: applications.userId,
               status: applications.status,
               postingUrl: postings.url,
               source: postings.sourceId,
               vacancyId: postings.vacancyId,
               fields: applications.formFields,
            })
            .from(applications)
            .innerJoin(postings, eq(postings.id, applications.postingId))
            .where(eq(applications.id, applicationId));
         return row;
      },

      async setPrepared(applicationId, fields) {
         await db
            .update(applications)
            .set({ status: "ready_for_review", formFields: fields, failureReason: null })
            .where(and(eq(applications.id, applicationId), notSentSql));
      },

      async getToFill(applicationId) {
         return this.getToPrepare(applicationId);
      },

      async setSubmitted(applicationId) {
         await db
            .update(applications)
            .set({ status: "submitted", submittedAt: sql`now()`, failureReason: null })
            .where(eq(applications.id, applicationId));
      },

      async markSentByHand(userId, postingId) {
         const [row] = await db
            .insert(applications)
            .values({
               userId,
               postingId,
               status: "submitted",
               origin: "manual",
               submittedAt: sql`now()`,
            })
            // one sent already stays as it was; one JobPilot was on is sent by hand now
            .onConflictDoUpdate({
               target: [applications.userId, applications.postingId],
               set: {
                  status: "submitted",
                  origin: "manual",
                  submittedAt: sql`now()`,
                  failureReason: null,
                  updatedAt: sql`now()`,
               },
               setWhere: ne(applications.status, "submitted"),
            })
            .returning({ id: applications.id });
         if (row) return row;
         const [sent] = await db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.userId, userId), eq(applications.postingId, postingId)));
         return sent!;
      },

      async unmarkSentByHand(userId, applicationId) {
         const mine = and(
            eq(applications.id, applicationId),
            eq(applications.userId, userId),
            eq(applications.origin, "manual"),
         );
         // answered by JobPilot before I marked it: its answers stay, for review again
         const restored = await db
            .update(applications)
            .set({
               status: "ready_for_review",
               origin: "jobpilot",
               submittedAt: null,
               updatedAt: sql`now()`,
            })
            .where(and(mine, sql`jsonb_array_length(${applications.formFields}) > 0`))
            .returning({ id: applications.id });
         if (restored.length > 0) return true;
         const deleted = await db
            .delete(applications)
            .where(mine)
            .returning({ id: applications.id });
         return deleted.length > 0;
      },

      async setFillProblem(applicationId, reason) {
         await db
            .update(applications)
            .set({ failureReason: reason })
            .where(eq(applications.id, applicationId));
      },

      async clearFillProblem(applicationId) {
         await db
            .update(applications)
            .set({ failureReason: null })
            .where(
               and(eq(applications.id, applicationId), eq(applications.status, "ready_for_review")),
            );
      },

      async saveFields(applicationId, fields) {
         const rows = await db
            .update(applications)
            .set({ formFields: fields })
            .where(
               and(eq(applications.id, applicationId), eq(applications.status, "ready_for_review")),
            )
            .returning({ id: applications.id });
         return rows.length > 0;
      },

      async setFailed(applicationId, reason) {
         await db
            .update(applications)
            .set({ status: "failed", failureReason: reason })
            .where(and(eq(applications.id, applicationId), notSentSql));
      },

      async setCannotApply(applicationId, reason) {
         await db
            .update(applications)
            .set({ status: "cannot_apply", failureReason: reason })
            .where(and(eq(applications.id, applicationId), notSentSql));
      },
   };
}
