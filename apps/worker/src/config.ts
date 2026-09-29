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
};
