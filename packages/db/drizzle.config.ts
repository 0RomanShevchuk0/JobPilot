import { defineConfig } from "drizzle-kit";

// drizzle-kit runs with packages/db as cwd; .env lives at the monorepo root
if (!process.env.DATABASE_URL) process.loadEnvFile("../../.env");

export default defineConfig({
   dialect: "postgresql",
   schema: "./src/schema.ts",
   out: "./drizzle",
   dbCredentials: { url: process.env.DATABASE_URL! },
});
