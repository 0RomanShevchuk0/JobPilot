// scripts run with apps/worker as cwd; .env lives at the monorepo root
if (!process.env.DATABASE_URL) process.loadEnvFile("../../.env");

function required(name: string): string {
   const value = process.env[name];
   if (!value) throw new Error(`Missing environment variable ${name}`);
   return value;
}

function list(name: string): string[] {
   return (process.env[name] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
}

export const config = {
   databaseUrl: required("DATABASE_URL"),
   redisUrl: required("REDIS_URL"),
   discoverEveryMs: Number(process.env.DISCOVER_EVERY_MINUTES ?? 180) * 60_000,
   // until user profiles exist, what to look for comes from the environment
   djinniKeywords: list("DJINNI_KEYWORDS"),
   douCategories: list("DOU_CATEGORIES"),
   // single-user for now: one session per source, saved by `pnpm login:<source>` (.data/ is gitignored)
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

/** Where the user's session on a source is kept: .data/sessions/<source>.json */
export function sessionPath(source: string): string {
   return `${config.sessionsDir}/${source}.json`;
}

/** How the user logs in to a source again, for messages about a missing or expired session. */
export function loginHint(source: string): string {
   return `run \`pnpm login:${source}\` in apps/worker`;
}
