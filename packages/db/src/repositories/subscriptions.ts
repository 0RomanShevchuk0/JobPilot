import { sql } from "drizzle-orm";
import { postings, profiles } from "../schema.js";

/**
 * SQL condition for a query joining profiles and postings: the posting's category (from its page) is
 * among the ones the profile picked on its source, e.g. { "dou": ["Node.js"] } and a DOU posting in
 * "Node.js". That is what subscribes a user to a posting; a vacancy is theirs when one of its active
 * postings is.
 */
export const profilePickedPostingCategorySql = sql`(${profiles.sourceCategories} -> ${postings.sourceId}) @> jsonb_build_array(${postings.parsed} ->> 'category')`;
