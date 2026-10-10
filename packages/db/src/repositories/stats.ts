import type { Stats } from "@jobpilot/contracts";
import { and, count, eq, gte, sql, type SQL } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, vacancies, vacancyMatches } from "../schema.js";

export interface StatsOptions {
   /** start of the period; null = all time */
   since: Date | null;
   /** what one bar of the timeline covers */
   bucket: "hour" | "day";
   /** IANA time zone the hours and days of the timeline are counted in, e.g. "Europe/Kyiv" */
   timeZone: string;
}

export interface StatsRepository {
   /**
    * The funnel of vacancies found since the start of the period, the user's applications sent or
    * failed since then, and the found ones per hour or day. Evaluations made for older profile versions
    * count too: the vacancy went through them all the same.
    */
   forUser(userId: string, options: StatsOptions): Promise<Omit<Stats, "period">>;
}

export function createStatsRepository(db: Drizzle): StatsRepository {
   const verdict = sql`${vacancyMatches.analysis}->'ai'->>'verdict'`;
   const suitable = sql`${verdict} in ('apply', 'stretch')`;
   // absent when the job site wasn't asked: counted as not refused, as the matches list does
   const notRefused = sql`(${vacancyMatches.analysis}->'applyCheck'->>'canApply') is distinct from 'false'`;
   const userMatch = (userId: string) =>
      and(eq(vacancyMatches.vacancyId, vacancies.id), eq(vacancyMatches.userId, userId));

   return {
      async forUser(userId, { since, bucket, timeZone }) {
         const createdInPeriod = since ? gte(vacancies.createdAt, since) : undefined;

         const [funnel] = await db
            .select({
               found: count(),
               prefilterPassed: countWhere(eq(vacancyMatches.prefilterPassed, true)),
               scored: countWhere(sql`${vacancyMatches.score} is not null`),
               apply: countWhere(sql`${verdict} = 'apply'`),
               stretch: countWhere(sql`${verdict} = 'stretch'`),
               canApply: countWhere(and(suitable, notRefused)),
               applied: countWhere(eq(vacancyMatches.status, "applied")),
               hidden: countWhere(eq(vacancyMatches.status, "hidden")),
            })
            .from(vacancies)
            .leftJoin(vacancyMatches, userMatch(userId))
            .where(createdInPeriod);

         const [applicationCounts] = await db
            .select({
               submitted: countWhere(
                  and(
                     eq(applications.status, "submitted"),
                     since ? gte(applications.submittedAt, since) : undefined,
                  ),
               ),
               // a failed application has no date of its own: the failure is its last update
               failed: countWhere(
                  and(
                     eq(applications.status, "failed"),
                     since ? gte(applications.updatedAt, since) : undefined,
                  ),
               ),
            })
            .from(applications)
            .where(eq(applications.userId, userId));

         // every hour or day of the period, empty ones too: a gap shows the collection stopped
         const start = since
            ? sql`${since.toISOString()}::timestamptz`
            : sql`(select min(${vacancies.createdAt}) from ${vacancies})`;
         const step = `1 ${bucket}`;
         // raw rows keep timestamps as Postgres prints them ("2026-10-10 00:00:00+00")
         const { rows } = await db.execute<{ start: string; found: number; suitable: number }>(sql`
            select
               b.start,
               count(${vacancies.id})::int as found,
               count(*) filter (where ${suitable})::int as suitable
            from generate_series(
               date_trunc(${bucket}, ${start}, ${timeZone}),
               now(),
               ${step}::interval,
               ${timeZone}
            ) as b(start)
            left join ${vacancies}
               on date_trunc(${bucket}, ${vacancies.createdAt}, ${timeZone}) = b.start
               and ${createdInPeriod ?? sql`true`}
            left join ${vacancyMatches} on ${userMatch(userId)}
            group by b.start
            order by b.start
         `);

         return {
            funnel: funnel!,
            applications: applicationCounts!,
            timeline: rows.map((r) => ({
               start: new Date(r.start).toISOString(),
               found: r.found,
               suitable: r.suitable,
            })),
         };
      },
   };
}

/** How many rows of the group meet the condition; all of them without one. */
function countWhere(condition: SQL | undefined) {
   return sql<number>`count(*) filter (where ${condition ?? sql`true`})`.mapWith(Number);
}
