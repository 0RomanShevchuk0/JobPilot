import type { Stats } from "@jobpilot/contracts";
import { and, count, eq, gte, not, sql, type SQL } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { applications, postings, vacancies, vacancyMatches } from "../schema.js";
import { postingRefusedOnItsPageSql } from "./apply-checks.js";
import { userSubscribedToVacancySql } from "./subscriptions.js";

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
    * The funnel of vacancies found in the user's categories since the start of the period, the user's
    * applications sent or failed since then, and the found ones per hour or day. Evaluations made for
    * older profile versions count too: the vacancy went through them all the same.
    */
   forUser(userId: string, options: StatsOptions): Promise<Omit<Stats, "period">>;
}

export function createStatsRepository(db: Drizzle): StatsRepository {
   const verdict = sql`${vacancyMatches.analysis}->'ai'->>'verdict'`;
   const suitable = sql`${verdict} in ('apply', 'stretch')`;
   // absent when the job site wasn't asked: counted as not refused, as the matches list does
   const notRefused = sql`(${vacancyMatches.analysis}->'applyCheck'->>'canApply') is distinct from 'false'`;
   // refused on every job site the vacancy is still on, each on its page (the can-apply check) or to
   // an application: as refused as the check's "can't apply" as one, as the
   // matches list shows it. A closed vacancy (no posting left) isn't refused this way: "every one of
   // none" would count it so
   const refusedOnEverySite = (userId: string) => {
      const activePosting = sql`${postings.vacancyId} = ${vacancies.id} and ${postings.goneAt} is null`;
      const refusedAnApplication = sql`exists (
         select 1 from ${applications}
         where ${applications.userId} = ${userId} and ${applications.postingId} = ${postings.id}
            and ${applications.status} = 'cannot_apply'
      )`;
      // in parentheses: not() puts none around what it negates
      return sql`(exists (select 1 from ${postings} where ${activePosting})
         and not exists (
            select 1 from ${postings}
            where ${activePosting} and not (${postingRefusedOnItsPageSql} or ${refusedAnApplication})
         ))`;
   };
   const userMatch = (userId: string) =>
      and(eq(vacancyMatches.vacancyId, vacancies.id), eq(vacancyMatches.userId, userId));

   return {
      async forUser(userId, { since, bucket, timeZone }) {
         const createdInPeriod = since ? gte(vacancies.createdAt, since) : undefined;
         // found means found in my categories: others' searches bring vacancies I never looked for
         const mine = userSubscribedToVacancySql(userId);

         const [funnel] = await db
            .select({
               found: count(),
               prefilterPassed: countWhere(eq(vacancyMatches.prefilterPassed, true)),
               scored: countWhere(sql`${vacancyMatches.score} is not null`),
               apply: countWhere(sql`${verdict} = 'apply'`),
               stretch: countWhere(sql`${verdict} = 'stretch'`),
               canApply: countWhere(and(suitable, notRefused, not(refusedOnEverySite(userId)))),
               // sent through any of its postings, by JobPilot or marked by hand
               applied: countWhere(sql`exists (
                  select 1 from ${applications}
                  inner join ${postings} on ${postings.id} = ${applications.postingId}
                  where ${applications.userId} = ${userId} and ${postings.vacancyId} = ${vacancies.id}
                     and ${applications.status} = 'submitted'
               )`),
               hidden: countWhere(eq(vacancyMatches.status, "hidden")),
            })
            .from(vacancies)
            .leftJoin(vacancyMatches, userMatch(userId))
            .where(and(createdInPeriod, mine));

         const [applicationCounts] = await db
            .select({
               submitted: countWhere(
                  and(
                     eq(applications.status, "submitted"),
                     since ? gte(applications.submittedAt, since) : undefined,
                  ),
               ),
               // failed and cannot_apply have no date of their own: it is their last update
               failed: countWhere(
                  and(
                     eq(applications.status, "failed"),
                     since ? gte(applications.updatedAt, since) : undefined,
                  ),
               ),
               cannotApply: countWhere(
                  and(
                     eq(applications.status, "cannot_apply"),
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
               and ${mine}
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
