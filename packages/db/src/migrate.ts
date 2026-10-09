import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";

// the migrations drizzle-kit generates, shipped with the package: dist/ → ../drizzle
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../drizzle", import.meta.url));

/**
 * Applies the migrations the database hasn't had yet, the way `drizzle-kit migrate` does (same
 * drizzle.__drizzle_migrations table), but with drizzle-orm alone: runs where drizzle-kit, a dev
 * dependency, isn't installed.
 */
export async function migrateDatabase(url: string): Promise<void> {
   const db = drizzle(url);
   try {
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
   } finally {
      await db.$client.end();
   }
}
