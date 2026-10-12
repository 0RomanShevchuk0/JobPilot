// scripts run with apps/worker as cwd; .env lives at the monorepo root
if (!process.env.DATABASE_URL) process.loadEnvFile("../../.env");

function required(name: string): string {
   const value = process.env[name];
   if (!value) throw new Error(`Missing environment variable ${name}`);
   return value;
}

export const config = {
   databaseUrl: required("DATABASE_URL"),
   redisUrl: required("REDIS_URL"),
   discoverEveryMs: Number(process.env.DISCOVER_EVERY_MINUTES ?? 180) * 60_000,
   // one folder per user, saved by `pnpm login:<source>` (.data/ is gitignored)
   sessionsDir: "../../.data/sessions",
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
 * The server's public key for the sessions in the database: everyone's `pnpm login:<source>` encrypts
 * with it, only the server's SESSION_PRIVATE_KEY decrypts. Not a secret; from `pnpm session-keys:generate`.
 */
export const SESSION_PUBLIC_KEY = "fiej5RPyJ3Z29X/8+ZMQ3qylZ7yv6JTb0ZC0M1XOPSI=";

/**
 * Where a user's own session on a source is kept: .data/sessions/<user id>/<source>.json. Everything
 * the worker does on a site for a user goes with their session; without one it isn't done for them.
 */
export function sessionPath(userId: string, source: string): string {
   return `${config.sessionsDir}/${userId}/${source}.json`;
}

/** How the user logs in to a source again, for messages about a missing or expired session. */
export function loginHint(source: string): string {
   return `run \`pnpm login:${source}\` in apps/worker`;
}
