// Public API of the package. The Drizzle schema (./schema.ts) is internal: it is used by
// drizzle-kit for migrations and by repositories, never imported by apps directly.
export * from "./client.js";
export type { PostingsRepository, PostingToFetch } from "./repositories/postings.js";
export type { SourceInfo, SourcesRepository } from "./repositories/sources.js";
export type {
   LinkPostingInput,
   VacanciesRepository,
   VacancyPosting,
} from "./repositories/vacancies.js";
