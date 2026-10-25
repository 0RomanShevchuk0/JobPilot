import { sql } from "drizzle-orm";
import { postings, vacancyMatches } from "../schema.js";

/**
 * SQL condition for a query joining vacancy_matches and postings: the posting's page refused in the
 * can-apply check. Its own answer (analysis.applyChecks); in an evaluation checked before each site's
 * was kept, the answer as one (applyCheck): every site refused then. Not asked: not refused. As
 * postingRefusal in matches.ts reads it.
 */
export const postingRefusedOnItsPageSql = sql`coalesce(
   case when ${vacancyMatches.analysis} ? 'applyChecks'
      then ${vacancyMatches.analysis}->'applyChecks'->(${postings.id}::text)->>'canApply'
      else ${vacancyMatches.analysis}->'applyCheck'->>'canApply'
   end,
   'true'
) = 'false'`;
