// Applies the database migrations that haven't run yet, then exits. The worker's container runs it
// before every start, so a deploy brings the schema up to date before the new code uses it.
import { migrateDatabase } from "@jobpilot/db";
import { config } from "../config.js";
import { log } from "../log.js";

await migrateDatabase(config.databaseUrl);
log("migrate", "the database schema is up to date");
