import { sql } from "drizzle-orm";
import { applications, jobAttempts, postings } from "../../schema.js";

/**
 * SQL condition for a query over postings: I may apply through the posting again. It sends applicants
 * to the employer's site (a job site's own form refuses a second application), I applied through it,
 * my latest attempt at its vacancy got no answer (no_answer: an earlier attempt's silence doesn't count
 * once I'm in another), and the job site bumped the posting after that attempt's applications: the
 * employer is still looking. The attempt is the one addToAttempt puts the next application in.
 */
export function postingBumpedSinceUnansweredApplicationSql(userId: string) {
   const bumpedAt = sql`(${postings.parsed}->>'publishedAt')::timestamptz`;
   return sql`(${postings.parsed}->'apply'->>'method' = 'external'
      -- a page with no date: never bumped as far as we know. Without this, "no application since
      -- null" below is true
      and ${bumpedAt} is not null
      and exists (
         select 1 from ${applications}
         where ${applications.userId} = ${userId} and ${applications.postingId} = ${postings.id}
            and ${applications.status} = 'submitted'
      )
      and (
         select ${jobAttempts.status} = 'no_answer' and not exists (
            select 1 from ${applications}
            where ${applications.attemptId} = ${jobAttempts.id}
               and ${applications.submittedAt} >= ${bumpedAt}
         )
         from ${jobAttempts}
         where ${jobAttempts.userId} = ${userId} and ${jobAttempts.vacancyId} = ${postings.vacancyId}
         order by ${jobAttempts.appliedAt} desc, ${jobAttempts.id} desc
         limit 1
      ) is true)`;
}
