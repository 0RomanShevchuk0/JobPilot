import type { ApplicationStatus, ApplicationView, FormField } from "@jobpilot/contracts";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, postings } from "../schema.js";

/** What the worker needs to prepare an application. */
export interface ApplicationToPrepare {
   userId: string;
   status: ApplicationStatus;
   /** the job page to open */
   postingUrl: string;
   source: string;
   vacancyId: string | null;
}

/** What the worker needs to fill an application into the form. */
export interface ApplicationToFill extends ApplicationToPrepare {
   fields: FormField[];
}

export interface ApplicationsRepository {
   /** The vacancy's active posting on one of these sources (the ones we can apply through), if any. */
   findPostingToApply(vacancyId: string, sources: string[]): Promise<string | undefined>;
   /**
    * Starts preparing the application to a posting: a new one, or the existing one again (its old
    * answers are dropped). Returns undefined when it was already submitted: there is nothing to prepare.
    */
   startPreparing(userId: string, postingId: string): Promise<{ id: string } | undefined>;
   get(userId: string, applicationId: string): Promise<ApplicationView | undefined>;
   getToPrepare(applicationId: string): Promise<ApplicationToPrepare | undefined>;
   /** The form was read and answered: ready for the user to review. */
   setPrepared(applicationId: string, fields: FormField[]): Promise<void>;
   setFailed(applicationId: string, reason: string): Promise<void>;
   getToFill(applicationId: string): Promise<ApplicationToFill | undefined>;
   /** The user sent the form. */
   setSubmitted(applicationId: string): Promise<void>;
   /** Filling went wrong: the answers stay ready for review, the reason is shown with them. */
   setFillProblem(applicationId: string, reason: string): Promise<void>;
}

export function createApplicationsRepository(db: Drizzle): ApplicationsRepository {
   return {
      async findPostingToApply(vacancyId, sources) {
         const [row] = await db
            .select({ id: postings.id })
            .from(postings)
            .where(
               and(
                  eq(postings.vacancyId, vacancyId),
                  inArray(postings.sourceId, sources),
                  isNull(postings.goneAt),
               ),
            )
            .orderBy(desc(postings.lastSeenAt))
            .limit(1);
         return row?.id;
      },

      async startPreparing(userId, postingId) {
         const [row] = await db
            .insert(applications)
            .values({ userId, postingId, status: "preparing" })
            .onConflictDoUpdate({
               target: [applications.userId, applications.postingId],
               set: {
                  status: "preparing",
                  failureReason: null,
                  formFields: [],
                  updatedAt: sql`now()`,
               },
               setWhere: ne(applications.status, "submitted"),
            })
            .returning({ id: applications.id });
         return row;
      },

      async get(userId, applicationId) {
         const [row] = await db
            .select({
               id: applications.id,
               vacancyId: postings.vacancyId,
               postingUrl: postings.url,
               status: applications.status,
               failureReason: applications.failureReason,
               fields: applications.formFields,
               createdAt: applications.createdAt,
               updatedAt: applications.updatedAt,
            })
            .from(applications)
            .innerJoin(postings, eq(postings.id, applications.postingId))
            .where(and(eq(applications.userId, userId), eq(applications.id, applicationId)));
         return (
            row && {
               ...row,
               createdAt: row.createdAt.toISOString(),
               updatedAt: row.updatedAt.toISOString(),
            }
         );
      },

      async getToPrepare(applicationId) {
         const [row] = await db
            .select({
               userId: applications.userId,
               status: applications.status,
               postingUrl: postings.url,
               source: postings.sourceId,
               vacancyId: postings.vacancyId,
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
            .where(eq(applications.id, applicationId));
      },

      async getToFill(applicationId) {
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

      async setSubmitted(applicationId) {
         await db
            .update(applications)
            .set({ status: "submitted", submittedAt: sql`now()`, failureReason: null })
            .where(eq(applications.id, applicationId));
      },

      async setFillProblem(applicationId, reason) {
         await db
            .update(applications)
            .set({ failureReason: reason })
            .where(eq(applications.id, applicationId));
      },

      async setFailed(applicationId, reason) {
         await db
            .update(applications)
            .set({ status: "failed", failureReason: reason })
            .where(eq(applications.id, applicationId));
      },
   };
}
