// Public API of the package. The Drizzle schema (./schema.ts) is internal: it is used by
// drizzle-kit for migrations and by repositories, never imported by apps directly.
export * from "./client.js";
export type { ApplicationsRepository, ApplicationToPrepare } from "./repositories/applications.js";
export type { DocumentsRepository, StoredDocumentFile } from "./repositories/documents.js";
export type {
   Assessment,
   MatchListOptions,
   MatchesRepository,
   MatchInput,
   StoredMatch,
} from "./repositories/matches.js";
export type { PostingsRepository, PostingToFetch } from "./repositories/postings.js";
export type { ProfilesRepository, StoredProfile } from "./repositories/profiles.js";
export type { SourceInfo, SourcesRepository } from "./repositories/sources.js";
export type { UsersRepository } from "./repositories/users.js";
export type {
   LinkPostingInput,
   VacanciesRepository,
   VacancyForMatching,
   VacancyPosting,
} from "./repositories/vacancies.js";
