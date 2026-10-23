// Applies the database migrations that haven't run yet, then exits. The server's migrate service runs
// it (docker-compose.prod.yml) before the worker and the API start, so a deploy brings the schema up
// to date before the new code uses it.
//
// The database's address only, not the worker's config: that one wants the worker's whole environment
// (Redis, the LLM, its role), which the migrate service doesn't get.
import { migrateDatabase } from "@jobpilot/db";
import { log } from "../log.js";

// scripts run with apps/worker as cwd; .env lives at the monorepo root
if (!process.env.DATABASE_URL) process.loadEnvFile("../../.env");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Missing environment variable DATABASE_URL");

await migrateDatabase(databaseUrl);
log("migrate", "the database schema is up to date");
