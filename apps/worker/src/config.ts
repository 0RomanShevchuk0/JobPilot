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
   // 0: not collecting at all (main.ts); unset or empty: every 3 hours
   discoverEveryMs: Number(process.env.DISCOVER_EVERY_MINUTES || 180) * 60_000,
   // decrypts the users' sessions in the database, the API encrypts them with the public one
   sessionKeys: {
      publicKey: required("SESSION_PUBLIC_KEY"),
      privateKey: required("SESSION_PRIVATE_KEY"),
   },
   llm: {
      provider: required("LLM_PROVIDER"),
      model: process.env.LLM_MODEL || undefined, // the provider's default when empty
      geminiApiKey: process.env.GEMINI_API_KEY,
   },
};

/** How the user logs in to a source again, for messages about a missing or expired session. */
export const LOGIN_HINT = "log in to the site in Chrome with the JobPilot extension";
