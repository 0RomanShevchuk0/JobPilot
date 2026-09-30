import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createMatchesRepository, type MatchesRepository } from "./repositories/matches.js";
import { createPostingsRepository, type PostingsRepository } from "./repositories/postings.js";
import { createProfilesRepository, type ProfilesRepository } from "./repositories/profiles.js";
import { createSourcesRepository, type SourcesRepository } from "./repositories/sources.js";
import { createUsersRepository, type UsersRepository } from "./repositories/users.js";
import { createVacanciesRepository, type VacanciesRepository } from "./repositories/vacancies.js";
import * as schema from "./schema.js";

/**
 * The only way the rest of the system talks to the database.
 * Repositories get added here as real queries appear; Drizzle never leaves this package.
 */
export interface DatabaseClient {
   readonly sources: SourcesRepository;
   readonly postings: PostingsRepository;
   readonly vacancies: VacanciesRepository;
   readonly users: UsersRepository;
   readonly profiles: ProfilesRepository;
   readonly matches: MatchesRepository;
   ping(): Promise<void>;
   close(): Promise<void>;
}

export function createDatabase(connectionString: string): DatabaseClient {
   const pool = new Pool({ connectionString });
   const db = drizzle({ client: pool, schema });

   return {
      sources: createSourcesRepository(db),
      postings: createPostingsRepository(db),
      vacancies: createVacanciesRepository(db),
      users: createUsersRepository(db),
      profiles: createProfilesRepository(db),
      matches: createMatchesRepository(db),
      async ping() {
         await pool.query("SELECT 1");
      },
      close: () => pool.end(),
   };
}
