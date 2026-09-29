import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema.js";

/** The Drizzle instance repositories work with. Internal to this package. */
export type Drizzle = NodePgDatabase<typeof schema>;
