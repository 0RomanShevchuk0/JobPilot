import type { Drizzle } from "../drizzle.js";
import { sources } from "../schema.js";

export interface SourceInfo {
   id: string;
   name: string;
   baseUrl: string;
}

export interface SourcesRepository {
   /** Creates the source row postings reference, or refreshes its name and URL. */
   register(source: SourceInfo): Promise<void>;
}

export function createSourcesRepository(db: Drizzle): SourcesRepository {
   return {
      async register({ id, name, baseUrl }) {
         await db
            .insert(sources)
            .values({ id, name, baseUrl })
            .onConflictDoUpdate({ target: sources.id, set: { name, baseUrl } });
      },
   };
}
