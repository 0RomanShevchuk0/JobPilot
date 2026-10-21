// scripts run with apps/worker as cwd; .env lives at the monorepo root
if (!process.env.DATABASE_URL) process.loadEnvFile("../../.env");

function required(name: string): string {
   const value = process.env[name];
   if (!value) throw new Error(`Missing environment variable ${name}`);
   return value;
}

// where the worker runs: "server" (set in docker-compose.prod.yml) or "local", the user's own machine
const role = process.env.WORKER_ROLE || "local";
if (role !== "server" && role !== "local") {
   throw new Error(`WORKER_ROLE is "${role}": server or local`);
}

export const config = {
   role,
   databaseUrl: required("DATABASE_URL"),
   redisUrl: required("REDIS_URL"),
   discoverEveryMs: Number(process.env.DISCOVER_EVERY_MINUTES ?? 180) * 60_000,
   // one folder per user, saved by the API on this machine as the extension sends the sessions
   // (.data/ is gitignored): read by a local worker
   sessionsDir: "../../.data/sessions",
   // the server's only: decrypts the users' sessions in the database (see SESSION_PUBLIC_KEY in @jobpilot/session-crypto)
   sessionPrivateKey: role === "server" ? required("SESSION_PRIVATE_KEY") : undefined,
   // a local worker's only: the user whose sessions are on this machine, as for the API
   userEmail: role === "local" ? required("USER_EMAIL") : undefined,
   llm: {
      provider: required("LLM_PROVIDER"),
      model: process.env.LLM_MODEL || undefined, // the provider's default when empty
      geminiApiKey: process.env.GEMINI_API_KEY,
   },
};

/**
 * Where a user's own session on a source is kept: .data/sessions/<user id>/<source>.json. Everything
 * the worker does on a site for a user goes with their session; without one it isn't done for them.
 */
export function sessionPath(userId: string, source: string): string {
   return `${config.sessionsDir}/${userId}/${source}.json`;
}

/**
 * How the user logs in to a source again, for messages about a missing or expired session. The
 * extension's session reaches both workers: the database for the server's, the file the API on this
 * machine writes for a local one.
 */
export const LOGIN_HINT = "log in to the site in Chrome with the JobPilot extension";
