import type {
   JobAttemptChanges,
   JobAttemptListItem,
   JobAttemptStage,
   JobAttemptStatus,
} from "@jobpilot/contracts";
import { and, desc, eq, inArray, lte, ne, or, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, companies, jobAttempts, postings, sources, vacancies } from "../schema.js";

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
   listForUser(userId: string, options: JobAttemptListOptions): Promise<JobAttemptListItem[]>;
   /** Adds a row by hand; its company is found by the normalized name, or made. */
   create(userId: string, attempt: NewStoredJobAttempt): Promise<{ id: string }>;
   /**
    * Changes a row of mine. A stage or status that really changes counts the silence anew, and a new
    * stage ends a no_answer or ghosted: the company is clearly there. Notes, a company (set only on a
    * row with none) and the same value again leave them. False when there is no such row.
    */
   update(userId: string, attemptId: string, changes: StoredJobAttemptChanges): Promise<boolean>;
   /** Removes a row of mine; its applications stay sent. False when there is no such row. */
   delete(userId: string, attemptId: string): Promise<boolean>;
   /**
    * The active rows with no stage or status change since quietSince go to no_answer, or to ghosted
    * once the process began; an offer waits on me, not the company. Leaves their date: to Undo, that
    * row was never touched. Returns how many.
    */
   markSilent(quietSince: Date): Promise<number>;
}

type Transaction = Parameters<Parameters<Drizzle["transaction"]>[0]>[0];

// the statuses the worker sets, when a company goes quiet
const silentStatuses: JobAttemptStatus[] = ["no_answer", "ghosted"];

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
         const statusChanges = changes.status && ne(jobAttempts.status, changes.status);
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
               ...(stageChanges &&
                  !changes.status && {
                     status: sql<JobAttemptStatus>`case when ${and(stageChanges, inArray(jobAttempts.status, silentStatuses))} then 'active' else ${jobAttempts.status} end`,
                  }),
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

      async markSilent(quietSince) {
         const lastProgressSql = sql`coalesce(${jobAttempts.progressChangedAt}, ${jobAttempts.appliedAt})`;
         const marked = await db
            .update(jobAttempts)
            .set({
               status: sql<JobAttemptStatus>`case when ${jobAttempts.stage} = 'applied' then 'no_answer' else 'ghosted' end`,
            })
            .where(
               and(
                  eq(jobAttempts.status, "active"),
                  ne(jobAttempts.stage, "offer"),
                  lte(lastProgressSql, quietSince),
               ),
            )
            .returning({ id: jobAttempts.id });
         return marked.length;
      },
   };
}
