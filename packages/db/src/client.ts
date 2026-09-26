import { Pool } from "pg";

/**
 * The only way the rest of the system talks to the database.
 * Repositories get added here as real queries appear; Drizzle never leaves this package.
 */
export interface DatabaseClient {
   ping(): Promise<void>;
   close(): Promise<void>;
}

export function createDatabase(connectionString: string): DatabaseClient {
   const pool = new Pool({ connectionString });

   return {
      async ping() {
         await pool.query("SELECT 1");
      },
      close: () => pool.end(),
   };
}
