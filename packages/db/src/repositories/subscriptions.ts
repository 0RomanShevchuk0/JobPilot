import { sql } from "drizzle-orm";
import { postings, profiles, vacancies } from "../schema.js";

/**
 * SQL condition for a query joining profiles and postings: the posting's category (from its page) is
 * among the ones the profile picked on its source, e.g. { "dou": ["Node.js"] } and a DOU posting in
 * "Node.js". That is what subscribes a user to a posting; a vacancy is theirs when one of its active
 * postings is.
 */
export const profilePickedPostingCategorySql = sql`(${profiles.sourceCategories} -> ${postings.sourceId}) @> jsonb_build_array(${postings.parsed} ->> 'category')`;

/**
 * SQL condition for a query over vacancies: one of the vacancy's postings is in a category the user
 * picked on its source. What decides which vacancies the user sees in their list and stats. Gone
 * postings count too, so a closed vacancy stays in the stats of the period it was found in.
 */
export function userSubscribedToVacancySql(userId: string) {
   return sql`exists (
      select 1 from ${postings}
      join ${profiles} on ${profiles.userId} = ${userId}
      where ${postings.vacancyId} = ${vacancies.id} and ${profilePickedPostingCategorySql}
   )`;
}
