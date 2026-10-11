import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { sourceSessions } from "../schema.js";

export interface SourceSessionsRepository {
   /** The site answered as if logged out: the user's session there is over. Keeps when it was first seen. */
   markExpired(userId: string, sourceId: string): Promise<void>;
   /** A page of the site came with the user's session accepted. */
   markWorking(userId: string, sourceId: string): Promise<void>;
   /** The user's sessions found over, since when. */
   listExpired(userId: string): Promise<{ source: string; expiredAt: Date }[]>;
}

export function createSourceSessionsRepository(db: Drizzle): SourceSessionsRepository {
   return {
      async markExpired(userId, sourceId) {
         await db
            .insert(sourceSessions)
            .values({ userId, sourceId, expiredAt: new Date() })
            .onConflictDoUpdate({
               target: [sourceSessions.userId, sourceSessions.sourceId],
               set: { expiredAt: sql`coalesce(${sourceSessions.expiredAt}, now())` },
            });
      },

      async markWorking(userId, sourceId) {
         // a no-op on every check while it works: only a row marked over gets written
         await db
            .update(sourceSessions)
            .set({ expiredAt: null })
            .where(
               and(
                  eq(sourceSessions.userId, userId),
                  eq(sourceSessions.sourceId, sourceId),
                  isNotNull(sourceSessions.expiredAt),
               ),
            );
      },

      async listExpired(userId) {
         const rows = await db
            .select({ source: sourceSessions.sourceId, expiredAt: sourceSessions.expiredAt })
            .from(sourceSessions)
            .where(and(eq(sourceSessions.userId, userId), isNotNull(sourceSessions.expiredAt)));
         return rows.map((r) => ({ source: r.source, expiredAt: r.expiredAt! }));
      },
   };
}
