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
   // one folder per user, saved by `pnpm login:<source>` and by the API on this machine from the extension
   // (.data/ is gitignored): read by a local worker
   sessionsDir: "../../.data/sessions",
   // the server's only: decrypts the users' sessions in the database (see SESSION_PUBLIC_KEY in @jobpilot/session-crypto)
   sessionPrivateKey: role === "server" ? required("SESSION_PRIVATE_KEY") : undefined,
   // a local worker's only: the user whose sessions are on this machine, as for the API
   userEmail: role === "local" ? required("USER_EMAIL") : undefined,
   // where document files live (the CV attached to applications): the same storage as the API's
   storage: {
      endpoint: required("S3_ENDPOINT"),
      region: required("S3_REGION"),
      bucket: required("S3_BUCKET"),
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
   },
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

/** How the user logs in to a source again, for messages about a missing or expired session. */
export function loginHint(source: string): string {
   // the extension's session reaches both: the database for the server's worker, the file the API on
   // this machine writes for a local one
   return `log in to the site in Chrome with the JobPilot extension, or run \`pnpm login:${source}\` in apps/worker`;
}
