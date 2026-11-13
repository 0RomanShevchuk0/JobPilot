import type {
   JobAttemptChanges,
   JobAttemptListItem,
   JobAttemptSummary,
   RequestedSalary,
   JobAttemptStage,
   JobAttemptStatus,
} from "@jobpilot/contracts";
import {
   and,
   bindIfParam,
   desc,
   eq,
   ilike,
   inArray,
   isNull,
   lte,
   ne,
   or,
   sql,
   type Column,
   type GetColumnData,
   type SQL,
} from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, companies, jobAttempts, postings, sources, vacancies } from "../schema.js";
import { likeContainsPattern } from "./query-parts/like-pattern.js";
import { requestedSalaryColumns, salaryFromColumns } from "./query-parts/requested-salary.js";

export interface JobAttemptListOptions {
   /** text in the job's title or its company's name, as typed */
   q?: string;
   /** only at this stage */
   stage?: JobAttemptStage;
   /** only with this status */
   status?: JobAttemptStatus;
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
   requestedSalary?: RequestedSalary;
   notes?: string;
}

/** What changes on a row: the company is found by the normalized name, or made. */
export interface StoredJobAttemptChanges extends Omit<
   JobAttemptChanges,
   "companyName" | "appliedAt"
> {
   /** null = not known */
   company?: { name: string; normalizedName: string } | null;
   appliedAt?: Date;
}

/** What I already tried with a vacancy's employer, as stored. */
export interface StoredCompanyAttemptHistory {
   /** the vacancy's own row, the latest when I applied again; null when there's none of mine */
   thisAttempt: JobAttemptSummary | null;
   /** the vacancy's employer; null when it's hidden or there's no such vacancy */
   company: { name: string; normalizedName: string } | null;
   /**
    * how many other attempts at the employer: at its other vacancies, earlier ones at this one, rows
    * added by hand
    */
   otherCount: number;
   /** the latest of them, the latest applied first */
   latestOther: JobAttemptSummary[];
}

/**
 * How changing a row ended. title_required: a row added by hand has no vacancy's title to fall back
 * on. url_not_allowed: a row from JobPilot links to its vacancy, not to a page of its own.
 */
export type JobAttemptUpdateOutcome =
   "updated" | "not_found" | "title_required" | "url_not_allowed";

export interface JobAttemptsRepository {
   /** My tracker a page at a time, the latest applied first; only the rows matching the filters. */
   listForUser(userId: string, options: JobAttemptListOptions): Promise<JobAttemptListItem[]>;
   /** A row of my tracker as the list shows it; undefined when there's no such row of mine. */
   getForUser(userId: string, attemptId: string): Promise<JobAttemptListItem | undefined>;
   /**
    * My attempt at a vacancy, and the latest `limit` of my attempts at its employer's other vacancies
    * with their count.
    */
   getCompanyHistory(
      userId: string,
      vacancyId: string,
      limit: number,
   ): Promise<StoredCompanyAttemptHistory>;
   /**
    * Adds a row by hand; its company is found by the normalized name, or made. Its silence counts from
    * now, whatever date it was applied on.
    */
   create(userId: string, attempt: NewStoredJobAttempt): Promise<{ id: string }>;
   /**
    * Changes a row of mine. A stage or status that really changes counts the silence anew, and a new
    * stage ends a no_answer or ghosted: the company is clearly there. The rest that really changes
    * (the requested salary too) marks the row edited, for Undo. The same value again changes
    * neither. A company found anew is linked; the old one stays, even with nothing linked to it.
    */
   update(
      userId: string,
      attemptId: string,
      changes: StoredJobAttemptChanges,
   ): Promise<JobAttemptUpdateOutcome>;
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

// a row's title: what I wrote on it, or its vacancy's
const attemptTitleSql = sql<string | null>`coalesce(${jobAttempts.title}, ${vacancies.title})`;

/** The row's title or its company's name holds the text, in any case; % and _ in it are literal. */
function titleOrCompanyContainsSql(text: string) {
   const pattern = likeContainsPattern(text);
   return or(ilike(attemptTitleSql, pattern), ilike(companies.name, pattern));
}

/** column is distinct from value: unlike <>, a null against a value counts as a change too. */
function distinctFromSql<TColumn extends Column>(
   column: TColumn,
   value: GetColumnData<TColumn, "query">,
) {
   return sql`${column} is distinct from ${bindIfParam(value, column)}`;
}

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

/** The tracker's rows matching where, the latest applied first, with the applications of each. */
async function selectListItems(
   db: Drizzle,
   where: SQL | undefined,
   limit: number,
): Promise<JobAttemptListItem[]> {
   const rows = await db
      .select({
         id: jobAttempts.id,
         vacancyId: jobAttempts.vacancyId,
         title: attemptTitleSql,
         company: companies.name,
         url: jobAttempts.url,
         stage: jobAttempts.stage,
         status: jobAttempts.status,
         notes: jobAttempts.notes,
         appliedAt: jobAttempts.appliedAt,
         requestedSalaryAmount: jobAttempts.requestedSalaryAmount,
         requestedSalaryCurrency: jobAttempts.requestedSalaryCurrency,
         requestedSalaryPeriod: jobAttempts.requestedSalaryPeriod,
      })
      .from(jobAttempts)
      .leftJoin(vacancies, eq(vacancies.id, jobAttempts.vacancyId))
      .leftJoin(companies, eq(companies.id, jobAttempts.companyId))
      .where(where)
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

   return rows.map(
      ({ requestedSalaryAmount, requestedSalaryCurrency, requestedSalaryPeriod, ...row }) => ({
         ...row,
         appliedAt: row.appliedAt.toISOString(),
         requestedSalary: salaryFromColumns(
            requestedSalaryAmount,
            requestedSalaryCurrency,
            requestedSalaryPeriod,
         ),
         applications: sent
            .filter((application) => application.attemptId === row.id)
            .map(({ id, sourceName }) => ({ id, sourceName })),
      }),
   );
}

export function createJobAttemptsRepository(db: Drizzle): JobAttemptsRepository {
   return {
      async listForUser(userId, { q, stage, status, after, limit }) {
         // the next page: what comes below the last row shown. (a, b) < (x, y) compares like words: b
         // only when a ties. Its values are read from the table, not sent by the client: JS dates
         // would drop microseconds
         const belowLastShown = sql`
            (${jobAttempts.appliedAt}, ${jobAttempts.id}) < (
               select last_shown.applied_at, last_shown.id
               from job_attempts last_shown
               where last_shown.user_id = ${userId} and last_shown.id = ${after}
            )`;
         return selectListItems(
            db,
            and(
               eq(jobAttempts.userId, userId),
               q ? titleOrCompanyContainsSql(q) : undefined,
               stage ? eq(jobAttempts.stage, stage) : undefined,
               status ? eq(jobAttempts.status, status) : undefined,
               after ? belowLastShown : undefined,
            ),
            limit,
         );
      },

      async getForUser(userId, attemptId) {
         const [item] = await selectListItems(
            db,
            and(eq(jobAttempts.userId, userId), eq(jobAttempts.id, attemptId)),
            1,
         );
         return item;
      },

      async getCompanyHistory(userId, vacancyId, limit) {
         const summary = {
            id: jobAttempts.id,
            title: attemptTitleSql,
            stage: jobAttempts.stage,
            status: jobAttempts.status,
            appliedAt: jobAttempts.appliedAt,
         };
         const [[company], [thisAttempt]] = await Promise.all([
            db
               .select({
                  id: companies.id,
                  name: companies.name,
                  normalizedName: companies.normalizedName,
               })
               .from(vacancies)
               .innerJoin(companies, eq(companies.id, vacancies.companyId))
               .where(eq(vacancies.id, vacancyId)),
            // the latest: applying again after no answer starts another
            db
               .select(summary)
               .from(jobAttempts)
               .innerJoin(vacancies, eq(vacancies.id, jobAttempts.vacancyId))
               .where(and(eq(jobAttempts.userId, userId), eq(jobAttempts.vacancyId, vacancyId)))
               .orderBy(desc(jobAttempts.appliedAt), desc(jobAttempts.id))
               .limit(1),
         ]);

         const others = company
            ? await db
                 // every one counted, before the limit cuts them: one query, not two
                 .select({ ...summary, otherCount: sql<number>`count(*) over ()`.mapWith(Number) })
                 .from(jobAttempts)
                 .leftJoin(vacancies, eq(vacancies.id, jobAttempts.vacancyId))
                 .where(
                    and(
                       eq(jobAttempts.userId, userId),
                       eq(jobAttempts.companyId, company.id),
                       // rows added by hand and earlier attempts at this vacancy are others too
                       thisAttempt ? ne(jobAttempts.id, thisAttempt.id) : undefined,
                    ),
                 )
                 .orderBy(desc(jobAttempts.appliedAt), desc(jobAttempts.id))
                 .limit(limit)
            : [];

         const withIsoDate = <T extends { appliedAt: Date }>(row: T) => ({
            ...row,
            appliedAt: row.appliedAt.toISOString(),
         });
         return {
            thisAttempt: thisAttempt ? withIsoDate(thisAttempt) : null,
            company: company
               ? { name: company.name, normalizedName: company.normalizedName }
               : null,
            otherCount: others[0]?.otherCount ?? 0,
            latestOther: others.map(({ otherCount: _, ...row }) => withIsoDate(row)),
         };
      },

      async create(userId, { company, requestedSalary, ...attempt }) {
         return db.transaction(async (tx) => {
            const companyId = company ? await findOrCreateCompany(tx, company) : null;
            const [row] = await tx
               .insert(jobAttempts)
               // the silence counts from now: an old date goes in as it stands, not as long silent
               .values({
                  ...attempt,
                  ...requestedSalaryColumns(requestedSalary ?? null),
                  userId,
                  companyId,
                  progressChangedAt: sql`now()`,
               })
               .returning({ id: jobAttempts.id });
            return row!;
         });
      },

      async update(userId, attemptId, { company, requestedSalary, ...changes }) {
         const { stage, status, title, url, appliedAt, notes } = changes;
         const stageChanges = stage && ne(jobAttempts.stage, stage);
         const statusChanges = status && ne(jobAttempts.status, status);
         const progressChanges = or(stageChanges, statusChanges);
         return db.transaction(async (tx) => {
            const mine = and(eq(jobAttempts.id, attemptId), eq(jobAttempts.userId, userId));
            const [row] = await tx
               .select({ vacancyId: jobAttempts.vacancyId })
               .from(jobAttempts)
               .where(mine)
               .for("update");
            if (!row) return "not_found";
            const addedByHand = row.vacancyId === null;
            if (addedByHand && title === null) return "title_required";
            if (!addedByHand && url !== undefined) return "url_not_allowed";

            // null: not known any more
            const companyId = company && (await findOrCreateCompany(tx, company));
            const salaryFields =
               requestedSalary !== undefined ? requestedSalaryColumns(requestedSalary) : undefined;
            const edits = or(
               title !== undefined ? distinctFromSql(jobAttempts.title, title) : undefined,
               url !== undefined ? distinctFromSql(jobAttempts.url, url) : undefined,
               appliedAt && ne(jobAttempts.appliedAt, appliedAt),
               notes !== undefined ? ne(jobAttempts.notes, notes) : undefined,
               companyId !== undefined
                  ? distinctFromSql(jobAttempts.companyId, companyId)
                  : undefined,
               salaryFields &&
                  or(
                     distinctFromSql(
                        jobAttempts.requestedSalaryAmount,
                        salaryFields.requestedSalaryAmount,
                     ),
                     distinctFromSql(
                        jobAttempts.requestedSalaryCurrency,
                        salaryFields.requestedSalaryCurrency,
                     ),
                     distinctFromSql(
                        jobAttempts.requestedSalaryPeriod,
                        salaryFields.requestedSalaryPeriod,
                     ),
                  ),
            );
            await tx
               .update(jobAttempts)
               .set({
                  ...changes,
                  ...salaryFields,
                  ...(companyId !== undefined && { companyId }),
                  ...(stageChanges &&
                     !status && {
                        status: sql<JobAttemptStatus>`case when ${and(stageChanges, inArray(jobAttempts.status, silentStatuses))} then 'active' else ${jobAttempts.status} end`,
                     }),
                  ...(progressChanges && {
                     progressChangedAt: sql`case when ${progressChanges} then now() else ${jobAttempts.progressChangedAt} end`,
                  }),
                  ...(edits && {
                     editedAt: sql`case when ${edits} then now() else ${jobAttempts.editedAt} end`,
                  }),
               })
               .where(mine);
            return "updated";
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
