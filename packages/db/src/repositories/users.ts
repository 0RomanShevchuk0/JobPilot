import { eq } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { users } from "../schema.js";

export interface UsersRepository {
   /** The id of the user with this email; undefined when nobody signed in with it. */
   findIdByEmail(email: string): Promise<string | undefined>;
   listIds(): Promise<string[]>;
}

export function createUsersRepository(db: Drizzle): UsersRepository {
   return {
      async findIdByEmail(email) {
         const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
         return row?.id;
      },

      async listIds() {
         const rows = await db.select({ id: users.id }).from(users);
         return rows.map((r) => r.id);
      },
   };
}
