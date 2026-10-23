import type {
   ApplicationStatus,
   DocumentType,
   EmploymentType,
   FormField,
   HardFilters,
   Language,
   Location,
   MatchAnalysis,
   MatchStatus,
   NormalizedPosting,
   ProfileContacts,
   ProfileCurrency,
   RawContentType,
   SalaryPeriod,
   Seniority,
   WorkMode,
} from "@jobpilot/contracts";
import { sql } from "drizzle-orm";
import {
   boolean,
   index,
   integer,
   jsonb,
   pgTable,
   primaryKey,
   text,
   timestamp,
   unique,
   uniqueIndex,
   uuid,
} from "drizzle-orm/pg-core";

// Postgres 18 generates time-ordered UUIDs natively
const id = () =>
   uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`);
const tstz = (name: string) => timestamp(name, { withTimezone: true });
const emptyTextArray = sql`'{}'::text[]`;

// ─── Shared data: filled by source adapters, independent of users ───────────

export const sources = pgTable("sources", {
   id: text("id").primaryKey(), // 'djinni', 'dou', ...
   name: text("name").notNull(),
   baseUrl: text("base_url").notNull(),
   enabled: boolean("enabled").notNull().default(true),
});

/** One listing on one source. */
export const postings = pgTable(
   "postings",
   {
      id: id(),
      sourceId: text("source_id")
         .notNull()
         .references(() => sources.id),
      externalId: text("external_id").notNull(),
      url: text("url").notNull(),
      // null until the page is fetched and parsed
      parsed: jsonb("parsed").$type<NormalizedPosting>(),
      parserVersion: integer("parser_version"),
      firstSeenAt: tstz("first_seen_at").notNull().defaultNow(),
      lastSeenAt: tstz("last_seen_at").notNull().defaultNow(),
      goneAt: tstz("gone_at"), // null = still active on the source
      vacancyId: uuid("vacancy_id").references(() => vacancies.id), // null until dedup links it
   },
   (t) => [
      unique("postings_source_external_uq").on(t.sourceId, t.externalId),
      index("postings_vacancy_id_idx").on(t.vacancyId),
   ],
);

/** Latest raw page of a posting, kept for re-parsing without re-fetching. */
export const postingRaw = pgTable("posting_raw", {
   postingId: uuid("posting_id")
      .primaryKey()
      .references(() => postings.id, { onDelete: "cascade" }),
   contentType: text("content_type").$type<RawContentType>().notNull(),
   body: text("body").notNull(),
   contentHash: text("content_hash").notNull(),
   fetchedAt: tstz("fetched_at").notNull(),
});

export const companies = pgTable("companies", {
   id: id(),
   name: text("name").notNull(),
   normalizedName: text("normalized_name").notNull().unique(),
   website: text("website"),
});

/** The actual job, merged from one or more postings. Empty arrays mean "unknown". */
export const vacancies = pgTable(
   "vacancies",
   {
      id: id(),
      companyId: uuid("company_id").references(() => companies.id), // null = employer hidden
      title: text("title").notNull(),
      description: text("description").notNull(), // markdown
      seniority: text("seniority").$type<Seniority>(),
      employmentTypes: text("employment_types")
         .array()
         .$type<EmploymentType[]>()
         .notNull()
         .default(emptyTextArray),
      workModes: text("work_modes").array().$type<WorkMode[]>().notNull().default(emptyTextArray),
      locations: jsonb("locations").$type<Location[]>().notNull().default([]),
      languages: jsonb("languages").$type<Language[]>().notNull().default([]),
      salaryMin: integer("salary_min"),
      salaryMax: integer("salary_max"),
      salaryCurrency: text("salary_currency"),
      salaryPeriod: text("salary_period").$type<SalaryPeriod>(),
      skills: text("skills").array().notNull().default(emptyTextArray), // normalized: 'node.js', not 'NodeJS'
      experienceYears: integer("experience_years"),
      fingerprint: text("fingerprint").notNull(),
      createdAt: tstz("created_at").notNull().defaultNow(),
      updatedAt: tstz("updated_at").notNull().defaultNow(), // last time the merged fields changed; evaluations older than this are stale
      closedAt: tstz("closed_at"), // null = at least one posting still active
   },
   (t) => [index("vacancies_fingerprint_idx").on(t.fingerprint)],
);

// ─── Per-user data ────────────────────────────────────────────────────────────

/**
 * The users, as Better Auth keeps them (its "user" model): the fields are named the way it reads them.
 * A Google sign-in finds the user by email, so the users from before sign-in kept their data.
 */
export const users = pgTable("users", {
   id: id(),
   email: text("email").notNull().unique(),
   // the name on the Google account; empty for the users from before sign-in until they sign in
   name: text("name").notNull().default(""),
   emailVerified: boolean("email_verified").notNull().default(false),
   // the Google account's picture
   image: text("image"),
   createdAt: tstz("created_at").notNull().defaultNow(),
   updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ─── Sign-in (Better Auth): its "session", "account" and "verification" models ──

/**
 * A signed-in browser: the web's cookie, and the token the web hands the extension, are its token.
 * auth_, not to be taken for source_sessions, the user's sessions on the job sites.
 */
export const authSessions = pgTable(
   "auth_sessions",
   {
      id: id(),
      userId: uuid("user_id")
         .notNull()
         .references(() => users.id, { onDelete: "cascade" }),
      token: text("token").notNull().unique(),
      expiresAt: tstz("expires_at").notNull(),
      ipAddress: text("ip_address"),
      userAgent: text("user_agent"),
      createdAt: tstz("created_at").notNull().defaultNow(),
      updatedAt: tstz("updated_at").notNull().defaultNow(),
   },
   (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

/** How a user signs in: their Google account (providerId "google", accountId its user id there). */
export const authAccounts = pgTable(
   "auth_accounts",
   {
      id: id(),
      userId: uuid("user_id")
         .notNull()
         .references(() => users.id, { onDelete: "cascade" }),
      providerId: text("provider_id").notNull(),
      accountId: text("account_id").notNull(),
      accessToken: text("access_token"),
      refreshToken: text("refresh_token"),
      idToken: text("id_token"),
      accessTokenExpiresAt: tstz("access_token_expires_at"),
      refreshTokenExpiresAt: tstz("refresh_token_expires_at"),
      scope: text("scope"),
      // unused: sign-in is Google only, Better Auth's model has it for email and password
      password: text("password"),
      createdAt: tstz("created_at").notNull().defaultNow(),
      updatedAt: tstz("updated_at").notNull().defaultNow(),
   },
   (t) => [index("auth_accounts_user_idx").on(t.userId)],
);

/** Short-lived values of a sign-in on its way, such as the OAuth state between the redirects. */
export const authVerifications = pgTable(
   "auth_verifications",
   {
      id: id(),
      identifier: text("identifier").notNull(),
      value: text("value").notNull(),
      expiresAt: tstz("expires_at").notNull(),
      createdAt: tstz("created_at").notNull().defaultNow(),
      updatedAt: tstz("updated_at").notNull().defaultNow(),
   },
   (t) => [index("auth_verifications_identifier_idx").on(t.identifier)],
);

/**
 * The user's own session on a source: the session itself, for the server's worker, and how it last
 * went, as the worker found using it. No row = never logged in from a machine nor failed.
 */
export const sourceSessions = pgTable(
   "source_sessions",
   {
      userId: uuid("user_id")
         .notNull()
         .references(() => users.id, { onDelete: "cascade" }),
      sourceId: text("source_id")
         .notNull()
         .references(() => sources.id),
      // the session's cookies, encrypted with the server's public key: anyone with the database can
      // write theirs, only the server reads them (see encryptSession). Null = not logged in from a machine yet
      encryptedSession: text("encrypted_session"),
      // when a page of the site came back logged out; null = the last use of the session worked
      expiredAt: tstz("expired_at"),
   },
   (t) => [primaryKey({ columns: [t.userId, t.sourceId] })],
);

/** Job-search profile, one per user. Shapes of the untyped jsonb columns get defined with the profile feature. */
export const profiles = pgTable("profiles", {
   userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
   // +1 on every change of the profile or the CV; stale matches have a lower profile_version
   version: integer("version").notNull().default(1),
   contacts: jsonb("contacts").$type<ProfileContacts>().notNull().default({}),
   titles: text("titles").array().notNull().default(emptyTextArray),
   experienceYears: integer("experience_years"), // total, whole years
   skills: text("skills").array().notNull().default(emptyTextArray),
   salaryMin: integer("salary_min"),
   salaryTarget: integer("salary_target"),
   salaryCurrency: text("salary_currency").$type<ProfileCurrency>(),
   salaryPeriod: text("salary_period").$type<SalaryPeriod>(),
   locations: jsonb("locations").$type<Location[]>().notNull().default([]),
   workModes: text("work_modes").array().$type<WorkMode[]>().notNull().default(emptyTextArray),
   languages: jsonb("languages").$type<Language[]>().notNull().default([]),
   hardFilters: jsonb("hard_filters").$type<HardFilters>().notNull().default({}),
   // by source id, the categories to search there; a source missing or empty is off for the user
   sourceCategories: jsonb("source_categories")
      .$type<Record<string, string[]>>()
      .notNull()
      .default({}),
   notes: text("notes").notNull().default(""), // free-form facts for AI: notice period, work permit, relocation...
   applicationMessage: text("application_message").notNull().default(""),
   updatedAt: tstz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
});

/** Current AI evaluation of a vacancy for a user; overwritten on re-evaluation. */
export const vacancyMatches = pgTable(
   "vacancy_matches",
   {
      userId: uuid("user_id")
         .notNull()
         .references(() => users.id, { onDelete: "cascade" }), // deleting a user deletes their data
      vacancyId: uuid("vacancy_id")
         .notNull()
         .references(() => vacancies.id),
      profileVersion: integer("profile_version").notNull(),
      prefilterPassed: boolean("prefilter_passed").notNull(),
      // null when rejected by the prefilter: no LLM call was made
      score: integer("score"),
      analysis: jsonb("analysis").$type<MatchAnalysis>().notNull(),
      model: text("model"),
      promptVersion: integer("prompt_version"),
      evaluatedAt: tstz("evaluated_at").notNull().defaultNow(),
      // the user's mark (applied / hidden), null = new; re-evaluations keep it
      status: text("status").$type<Exclude<MatchStatus, null>>(),
      // when the status was set: the applied ones' history and the hidden ones go by it, latest first.
      // Null without a status
      statusChangedAt: tstz("status_changed_at"),
   },
   (t) => [primaryKey({ columns: [t.userId, t.vacancyId] })],
);

export const applications = pgTable(
   "applications",
   {
      id: id(),
      userId: uuid("user_id")
         .notNull()
         .references(() => users.id, { onDelete: "cascade" }), // deleting a user deletes their data
      postingId: uuid("posting_id")
         .notNull()
         .references(() => postings.id),
      status: text("status").$type<ApplicationStatus>().notNull().default("draft"),
      failureReason: text("failure_reason"),
      cvDocumentId: uuid("cv_document_id").references(() => documents.id),
      coverLetterDocumentId: uuid("cover_letter_document_id").references(() => documents.id),
      formFields: jsonb("form_fields").$type<FormField[]>().notNull().default([]),
      submittedAt: tstz("submitted_at"),
      createdAt: tstz("created_at").notNull().defaultNow(),
      updatedAt: tstz("updated_at")
         .notNull()
         .defaultNow()
         .$onUpdate(() => new Date()),
   },
   // one application per job posting: preparing again reuses it
   (t) => [unique("applications_user_posting_uq").on(t.userId, t.postingId)],
);

export const documents = pgTable(
   "documents",
   {
      id: id(),
      userId: uuid("user_id")
         .notNull()
         .references(() => users.id, { onDelete: "cascade" }), // deleting a user deletes their data
      type: text("type").$type<DocumentType>().notNull(),
      isBase: boolean("is_base").notNull().default(false),
      content: text("content").notNull(), // markdown
      filePath: text("file_path"), // key in the file storage
      fileName: text("file_name"), // as uploaded, for downloads
      model: text("model"), // null = uploaded by the user
      createdAt: tstz("created_at").notNull().defaultNow(),
   },
   // one base CV per user: uploading a new one replaces it
   (t) => [
      uniqueIndex("documents_base_cv_uq")
         .on(t.userId)
         .where(sql`${t.type} = 'cv' AND ${t.isBase}`),
   ],
);
