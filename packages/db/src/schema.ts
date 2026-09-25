import type {
  ApplicationStatus,
  DocumentType,
  EmploymentType,
  FormField,
  Language,
  Location,
  NormalizedPosting,
  RawContentType,
  SalaryPeriod,
  Seniority,
  WorkMode,
} from '@jobpilot/contracts';
import { sql } from 'drizzle-orm';
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
  uuid,
} from 'drizzle-orm/pg-core';

// Postgres 18 generates time-ordered UUIDs natively
const id = () => uuid('id').primaryKey().default(sql`uuidv7()`);
const tstz = (name: string) => timestamp(name, { withTimezone: true });
const emptyTextArray = sql`'{}'::text[]`;

// ─── Shared data: filled by source adapters, independent of users ───────────

export const sources = pgTable('sources', {
  id: text('id').primaryKey(), // 'djinni', 'dou', ...
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  enabled: boolean('enabled').notNull().default(true),
});

/** One listing on one source. */
export const postings = pgTable(
  'postings',
  {
    id: id(),
    sourceId: text('source_id').notNull().references(() => sources.id),
    externalId: text('external_id').notNull(),
    url: text('url').notNull(),
    // null until the page is fetched and parsed
    parsed: jsonb('parsed').$type<NormalizedPosting>(),
    parserVersion: integer('parser_version'),
    firstSeenAt: tstz('first_seen_at').notNull().defaultNow(),
    lastSeenAt: tstz('last_seen_at').notNull().defaultNow(),
    goneAt: tstz('gone_at'), // null = still active on the source
    vacancyId: uuid('vacancy_id').references(() => vacancies.id), // null until dedup links it
  },
  (t) => [
    unique('postings_source_external_uq').on(t.sourceId, t.externalId),
    index('postings_vacancy_id_idx').on(t.vacancyId),
  ],
);

/** Latest raw page of a posting, kept for re-parsing without re-fetching. */
export const postingRaw = pgTable('posting_raw', {
  postingId: uuid('posting_id')
    .primaryKey()
    .references(() => postings.id, { onDelete: 'cascade' }),
  contentType: text('content_type').$type<RawContentType>().notNull(),
  body: text('body').notNull(),
  contentHash: text('content_hash').notNull(),
  fetchedAt: tstz('fetched_at').notNull(),
});

export const companies = pgTable('companies', {
  id: id(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  website: text('website'),
});

/** The actual job, merged from one or more postings. Empty arrays mean "unknown". */
export const vacancies = pgTable(
  'vacancies',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    title: text('title').notNull(),
    description: text('description').notNull(), // markdown
    seniority: text('seniority').$type<Seniority>(),
    employmentTypes: text('employment_types').array().$type<EmploymentType[]>().notNull().default(emptyTextArray),
    workModes: text('work_modes').array().$type<WorkMode[]>().notNull().default(emptyTextArray),
    locations: jsonb('locations').$type<Location[]>().notNull().default([]),
    languages: jsonb('languages').$type<Language[]>().notNull().default([]),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: text('salary_currency'),
    salaryPeriod: text('salary_period').$type<SalaryPeriod>(),
    skills: text('skills').array().notNull().default(emptyTextArray), // normalized: 'node.js', not 'NodeJS'
    experienceYears: integer('experience_years'),
    fingerprint: text('fingerprint').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
    closedAt: tstz('closed_at'), // null = at least one posting still active
  },
  (t) => [index('vacancies_fingerprint_idx').on(t.fingerprint)],
);

// ─── Per-user data ────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  createdAt: tstz('created_at').notNull().defaultNow(),
});

/** Job-search profile, one per user. Shapes of the untyped jsonb columns get defined with the profile feature. */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // +1 on every change; stale matches have a lower profile_version
  contacts: jsonb('contacts').notNull().default({}),
  titles: text('titles').array().notNull().default(emptyTextArray),
  seniority: text('seniority').$type<Seniority>(),
  skills: jsonb('skills').notNull().default([]),
  salaryMin: integer('salary_min'),
  salaryCurrency: text('salary_currency'),
  salaryPeriod: text('salary_period').$type<SalaryPeriod>(),
  locations: jsonb('locations').$type<Location[]>().notNull().default([]),
  workModes: text('work_modes').array().$type<WorkMode[]>().notNull().default(emptyTextArray),
  languages: jsonb('languages').$type<Language[]>().notNull().default([]),
  hardFilters: jsonb('hard_filters').notNull().default({}),
  notes: text('notes').notNull().default(''), // free-form facts for AI: notice period, work permit, relocation...
  updatedAt: tstz('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Current AI evaluation of a vacancy for a user; overwritten on re-evaluation. */
export const vacancyMatches = pgTable(
  'vacancy_matches',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    vacancyId: uuid('vacancy_id')
      .notNull()
      .references(() => vacancies.id),
    profileVersion: integer('profile_version').notNull(),
    prefilterPassed: boolean('prefilter_passed').notNull(),
    // null when rejected by the prefilter: no LLM call was made
    score: integer('score'),
    analysis: jsonb('analysis').notNull(),
    model: text('model'),
    promptVersion: text('prompt_version'),
    evaluatedAt: tstz('evaluated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.vacancyId] })],
);

export const applications = pgTable('applications', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  postingId: uuid('posting_id')
    .notNull()
    .references(() => postings.id),
  status: text('status').$type<ApplicationStatus>().notNull().default('draft'),
  failureReason: text('failure_reason'),
  cvDocumentId: uuid('cv_document_id').references(() => documents.id),
  coverLetterDocumentId: uuid('cover_letter_document_id').references(() => documents.id),
  formFields: jsonb('form_fields').$type<FormField[]>().notNull().default([]),
  submittedAt: tstz('submitted_at'),
  createdAt: tstz('created_at').notNull().defaultNow(),
  updatedAt: tstz('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const documents = pgTable('documents', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').$type<DocumentType>().notNull(),
  isBase: boolean('is_base').notNull().default(false),
  content: text('content').notNull(), // markdown
  filePath: text('file_path'),
  model: text('model'), // null = uploaded by the user
  createdAt: tstz('created_at').notNull().defaultNow(),
});
