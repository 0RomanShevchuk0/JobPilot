import type { JobAttemptChanges, JobAttemptListItem } from "@jobpilot/contracts";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, companies, jobAttempts, postings, sources, vacancies } from "../schema.js";

/** A row of the tracker as stored: how silent the company is, the reader works out from the dates. */
export interface StoredJobAttempt extends Omit<JobAttemptListItem, "silence"> {
   /** the last change of the stage or status; null = never changed */
   progressChangedAt: string | null;
}

export interface JobAttemptListOptions {
   /** the last row of the previous page: the list goes on after it; absent = from the top */
   after?: string;
   limit: number;
}

/** A row added by hand. */
export interface NewStoredJobAttempt {
   title: string;
   url?: string;
   /** absent = not known */
   company?: { name: string; normalizedName: string };
   /** absent = now */
   appliedAt?: Date;
}

export interface JobAttemptsRepository {
   /** My tracker a page at a time, the latest applied first. */
   listForUser(userId: string, options: JobAttemptListOptions): Promise<StoredJobAttempt[]>;
   /** Adds a row by hand; its company is found by the normalized name, or made. */
   create(userId: string, attempt: NewStoredJobAttempt): Promise<{ id: string }>;
   /**
    * Changes a row of mine. The silence is counted anew by a stage or status that really changes, and
    * by active even on a row already active: the company answered, the stage stays. Notes and the same
    * value again leave it. False when there is no such row.
    */
   update(userId: string, attemptId: string, changes: JobAttemptChanges): Promise<boolean>;
   /** Removes a row of mine; its applications stay sent. False when there is no such row. */
   delete(userId: string, attemptId: string): Promise<boolean>;
}

type Transaction = Parameters<Parameters<Drizzle["transaction"]>[0]>[0];

/** The company with this normalized name; the first name seen stays, a new one is made. */
async function findOrCreateCompany(
   tx: Transaction,
   company: { name: string; normalizedName: string },
): Promise<string> {
   const [row] = await tx
      .insert(companies)
      .values(company)
      .onConflictDoUpdate({
         target: companies.normalizedName,
         // changes nothing: only so the existing row is returned
         set: { normalizedName: sql`excluded.normalized_name` },
      })
      .returning({ id: companies.id });
   return row!.id;
}

export function createJobAttemptsRepository(db: Drizzle): JobAttemptsRepository {
   return {
      async listForUser(userId, { after, limit }) {
         // the next page: what comes below the last row shown. (a, b) < (x, y) compares like words: b
         // only when a ties. Its values are read from the table, not sent by the client: JS dates
         // would drop microseconds
         const belowLastShown = sql`
            (${jobAttempts.appliedAt}, ${jobAttempts.id}) < (
               select last_shown.applied_at, last_shown.id
               from job_attempts last_shown
               where last_shown.user_id = ${userId} and last_shown.id = ${after}
            )`;
         const rows = await db
            .select({
               id: jobAttempts.id,
               vacancyId: jobAttempts.vacancyId,
               title: sql<string | null>`coalesce(${jobAttempts.title}, ${vacancies.title})`,
               company: companies.name,
               url: jobAttempts.url,
               stage: jobAttempts.stage,
               status: jobAttempts.status,
               notes: jobAttempts.notes,
               appliedAt: jobAttempts.appliedAt,
               progressChangedAt: jobAttempts.progressChangedAt,
            })
            .from(jobAttempts)
            .leftJoin(vacancies, eq(vacancies.id, jobAttempts.vacancyId))
            .leftJoin(companies, eq(companies.id, jobAttempts.companyId))
            .where(and(eq(jobAttempts.userId, userId), after ? belowLastShown : undefined))
            .orderBy(desc(jobAttempts.appliedAt), desc(jobAttempts.id))
            .limit(limit);

         const attemptIds = rows.map((row) => row.id);
         const sent = await db
            .select({
               attemptId: applications.attemptId,
               id: applications.id,
               sourceName: sources.name,
            })
            .from(applications)
            .innerJoin(postings, eq(postings.id, applications.postingId))
            .innerJoin(sources, eq(sources.id, postings.sourceId))
            .where(inArray(applications.attemptId, attemptIds))
            .orderBy(applications.submittedAt);

         return rows.map((row) => ({
            ...row,
            appliedAt: row.appliedAt.toISOString(),
            progressChangedAt: row.progressChangedAt?.toISOString() ?? null,
            applications: sent
               .filter((application) => application.attemptId === row.id)
               .map(({ id, sourceName }) => ({ id, sourceName })),
         }));
      },

      async create(userId, { title, url, company, appliedAt }) {
         return db.transaction(async (tx) => {
            const companyId = company ? await findOrCreateCompany(tx, company) : null;
            const [row] = await tx
               .insert(jobAttempts)
               .values({ userId, companyId, title, url, appliedAt })
               .returning({ id: jobAttempts.id });
            return row!;
         });
      },

      async update(userId, attemptId, changes) {
         const stageChanges = changes.stage && ne(jobAttempts.stage, changes.stage);
         const statusChanges =
            changes.status &&
            (changes.status === "active" ? sql`true` : ne(jobAttempts.status, changes.status));
         const progressChanges = or(stageChanges, statusChanges);
         const updated = await db
            .update(jobAttempts)
            .set({
               ...changes,
               ...(progressChanges && {
                  progressChangedAt: sql`case when ${progressChanges} then now() else ${jobAttempts.progressChangedAt} end`,
               }),
            })
            .where(and(eq(jobAttempts.id, attemptId), eq(jobAttempts.userId, userId)))
            .returning({ id: jobAttempts.id });
         return updated.length > 0;
      },

      async delete(userId, attemptId) {
         const deleted = await db
            .delete(jobAttempts)
            .where(and(eq(jobAttempts.id, attemptId), eq(jobAttempts.userId, userId)))
            .returning({ id: jobAttempts.id });
         return deleted.length > 0;
      },
   };
}
