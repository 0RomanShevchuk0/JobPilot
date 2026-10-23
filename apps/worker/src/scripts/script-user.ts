import { createDatabase } from "@jobpilot/db";
import { config } from "../config.js";

/** The user a script on this machine acts for: the one in USER_EMAIL. */
export async function scriptUserId(): Promise<string> {
   const email = process.env.USER_EMAIL;
   if (!email) throw new Error("USER_EMAIL is not set in .env: the script acts for that user");
   const database = createDatabase(config.databaseUrl);
   try {
      return await database.users.ensure(email);
   } finally {
      await database.close();
   }
}
