import type {
   JobAttemptChanges,
   JobAttemptListItem,
   JobAttemptStage,
   JobAttemptStatus,
} from "@jobpilot/contracts";
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
   /** absent = just applied */
   stage?: JobAttemptStage;
   status?: JobAttemptStatus;
   notes?: string;
}

/** What changes on a row: the company is found by the normalized name, or made. */
export interface StoredJobAttemptChanges extends Omit<JobAttemptChanges, "companyName"> {
   company?: { name: string; normalizedName: string };
}

export interface JobAttemptsRepository {
   /** My tracker a page at a time, the latest applied first. */
   listForUser(userId: string, options: JobAttemptListOptions): Promise<StoredJobAttempt[]>;
   /** Adds a row by hand; its company is found by the normalized name, or made. */
   create(userId: string, attempt: NewStoredJobAttempt): Promise<{ id: string }>;
   /**
    * Changes a row of mine. The silence is counted anew by a stage or status that really changes, and
    * by active even on a row already active: the company answered, the stage stays. Notes and the same
    * value again leave it, and so does a company, set only on a row with none. False when there is no
    * such row.
    */
   update(userId: string, attemptId: string, changes: StoredJobAttemptChanges): Promise<boolean>;
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

      async create(userId, { company, ...attempt }) {
         return db.transaction(async (tx) => {
            const companyId = company ? await findOrCreateCompany(tx, company) : null;
            const [row] = await tx
               .insert(jobAttempts)
               .values({ ...attempt, userId, companyId })
               .returning({ id: jobAttempts.id });
            return row!;
         });
      },

      async update(userId, attemptId, { company, ...changes }) {
         const stageChanges = changes.stage && ne(jobAttempts.stage, changes.stage);
         const statusChanges =
            changes.status &&
            (changes.status === "active" ? sql`true` : ne(jobAttempts.status, changes.status));
         const progressChanges = or(stageChanges, statusChanges);
         return db.transaction(async (tx) => {
            const mine = and(eq(jobAttempts.id, attemptId), eq(jobAttempts.userId, userId));
            const [row] = await tx
               .select({ companyId: jobAttempts.companyId })
               .from(jobAttempts)
               .where(mine)
               .for("update");
            if (!row) return false;

            // made only for a row that takes it: no company left in the table linked to nothing
            const companyId =
               company && !row.companyId ? await findOrCreateCompany(tx, company) : undefined;
            const fields = {
               ...changes,
               ...(companyId && { companyId }),
               ...(progressChanges && {
                  progressChangedAt: sql`case when ${progressChanges} then now() else ${jobAttempts.progressChangedAt} end`,
               }),
            };
            // a company on a row that has one, alone: nothing to write
            if (Object.keys(fields).length > 0)
               await tx.update(jobAttempts).set(fields).where(mine);
            return true;
         });
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
