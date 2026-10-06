import type { ApplicationListItem, ApplicationStatus, FormField } from "@jobpilot/contracts";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, postings, vacancies } from "../schema.js";

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

export interface ApplicationsRepository {
   /** The vacancy's active posting on one of these sources (the ones we can apply through), if any. */
   findPostingToApply(
      vacancyId: string,
      sources: string[],
   ): Promise<{ id: string; url: string } | undefined>;
   /**
    * Starts preparing the application to a posting: a new one, or the existing one again (its fields
    * stay until new answers replace them). Returns undefined when it was already submitted.
    */
   startPreparing(userId: string, postingId: string): Promise<{ id: string } | undefined>;
   /** My applications, the latest activity first. */
   listForUser(userId: string): Promise<ApplicationListItem[]>;
   get(userId: string, applicationId: string): Promise<StoredApplication | undefined>;
   getToPrepare(applicationId: string): Promise<ApplicationToPrepare | undefined>;
   /** The form was read and answered: ready for the user to review. */
   setPrepared(applicationId: string, fields: FormField[]): Promise<void>;
   setFailed(applicationId: string, reason: string): Promise<void>;
   getToFill(applicationId: string): Promise<ApplicationToFill | undefined>;
   /** The user sent the form. */
   setSubmitted(applicationId: string): Promise<void>;
   /** Filling went wrong: the answers stay ready for review, the reason is shown with them. */
   setFillProblem(applicationId: string, reason: string): Promise<void>;
   /** Replaces the answers while they are up for review; false when the application no longer is. */
   saveFields(applicationId: string, fields: FormField[]): Promise<boolean>;
}

// what the user sees of an application, its answers aside
const listColumns = {
   id: applications.id,
   vacancyId: postings.vacancyId,
   title: vacancies.title,
   postingUrl: postings.url,
   status: applications.status,
   failureReason: applications.failureReason,
   createdAt: applications.createdAt,
   updatedAt: applications.updatedAt,
};

function withIsoDates<T extends { createdAt: Date; updatedAt: Date }>(row: T) {
   return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
   };
}

export function createApplicationsRepository(db: Drizzle): ApplicationsRepository {
   return {
      async findPostingToApply(vacancyId, sources) {
         const [row] = await db
            .select({ id: postings.id, url: postings.url })
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
         return row;
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

      async listForUser(userId) {
         const rows = await db
            .select(listColumns)
            .from(applications)
            .innerJoin(postings, eq(postings.id, applications.postingId))
            .leftJoin(vacancies, eq(vacancies.id, postings.vacancyId))
            .where(eq(applications.userId, userId))
            .orderBy(desc(applications.updatedAt));
         return rows.map(withIsoDates);
      },

      async get(userId, applicationId) {
         const [row] = await db
            .select({ ...listColumns, fields: applications.formFields })
            .from(applications)
            .innerJoin(postings, eq(postings.id, applications.postingId))
            .leftJoin(vacancies, eq(vacancies.id, postings.vacancyId))
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
            .where(eq(applications.id, applicationId));
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

      async setFillProblem(applicationId, reason) {
         await db
            .update(applications)
            .set({ failureReason: reason })
            .where(eq(applications.id, applicationId));
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
            .where(eq(applications.id, applicationId));
      },
   };
}
