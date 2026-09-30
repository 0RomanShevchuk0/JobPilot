import type { Drizzle } from "../drizzle.js";
import { users } from "../schema.js";

export interface UsersRepository {
   /** The user with this email, created if missing. Returns the user id. */
   ensure(email: string): Promise<string>;
   listIds(): Promise<string[]>;
}

export function createUsersRepository(db: Drizzle): UsersRepository {
   return {
      async ensure(email) {
         const [row] = await db
            .insert(users)
            .values({ email })
            // a no-op update so RETURNING gives the id of an existing user too
            .onConflictDoUpdate({ target: users.email, set: { email } })
            .returning({ id: users.id });
         return row.id;
      },

      async listIds() {
         const rows = await db.select({ id: users.id }).from(users);
         return rows.map((r) => r.id);
      },
   };
}
