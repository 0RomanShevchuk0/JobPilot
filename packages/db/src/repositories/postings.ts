import { createHash } from "node:crypto";
import type { NormalizedPosting, PostingRef, RawPosting } from "@jobpilot/contracts";
import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { postingRaw, postings } from "../schema.js";

export interface PostingToFetch {
   postingId: string;
   ref: PostingRef;
   /** we had marked it gone and the source lists it again */
   cameBack?: boolean;
}

export interface PostingsRepository {
   /**
    * Records what discover() found on a source. Returns the postings worth fetching: never fetched
    * before, bumped on the source after the last fetch, or back after we had marked them gone: their
    * vacancy has to learn of it.
    */
   markSeen(sourceId: string, refs: PostingRef[]): Promise<PostingToFetch[]>;
   /**
    * Postings of a source we take for active, with neither a sighting in its listings nor a look at
    * their page since this moment, the longest unseen first. Only their page tells whether they are
    * closed: the listings show the latest jobs, an open one drops out of them too.
    */
   listLongUnseen(sourceId: string, since: Date, limit: number): Promise<PostingToFetch[]>;
   /** Stores the latest raw page and its parsed form. */
   saveFetched(
      postingId: string,
      raw: RawPosting,
      parsed: NormalizedPosting,
      parserVersion: number,
   ): Promise<void>;
   /** The source says the posting is closed or removed. */
   markGone(postingId: string): Promise<void>;
   /** The vacancy's postings still on their sites, the last seen first. */
   listActive(vacancyId: string): Promise<{ id: string; source: string; url: string }[]>;
   /** The last seen posting of the source still up: a page to open, e.g. to try a session on. */
   getLastSeenActiveUrl(sourceId: string): Promise<string | undefined>;
   /** The parsed form of a posting, or undefined if it is not fetched and parsed yet. */
   getParsed(postingId: string): Promise<NormalizedPosting | undefined>;
   /** Ids of every parsed posting, e.g. to rebuild all vacancies after the rules for building them change. */
   listParsedIds(): Promise<string[]>;
   /** Ids of fetched postings of a source parsed by an older parser, or not parsed at all. */
   listOutdatedIds(sourceId: string, parserVersion: number): Promise<string[]>;
   /** The stored page of a posting, to parse it again without fetching. */
   getRaw(postingId: string): Promise<RawPosting | undefined>;
   /** Replaces the parsed form after re-parsing the stored page; leaves the page and gone status alone. */
   saveParsed(postingId: string, parsed: NormalizedPosting, parserVersion: number): Promise<void>;
}

export function createPostingsRepository(db: Drizzle): PostingsRepository {
   return {
      async markSeen(sourceId, refs) {
         // one row per external id: Postgres rejects an upsert that touches the same row twice
         const byExternalId = new Map(refs.map((r) => [r.externalId, r]));
         const unique = [...byExternalId.values()];
         if (unique.length === 0) return [];

         const goneBefore = await db
            .select({ externalId: postings.externalId })
            .from(postings)
            .where(
               and(
                  eq(postings.sourceId, sourceId),
                  isNotNull(postings.goneAt),
                  inArray(
                     postings.externalId,
                     unique.map((r) => r.externalId),
                  ),
               ),
            );
         const goneExternalIds = new Set(goneBefore.map((p) => p.externalId));

         const rows = await db
            .insert(postings)
            .values(unique.map((r) => ({ sourceId, externalId: r.externalId, url: r.url })))
            .onConflictDoUpdate({
               target: [postings.sourceId, postings.externalId],
               // seen again: it is alive, even if we had marked it gone
               set: { url: sql`excluded.url`, lastSeenAt: sql`now()`, goneAt: null },
            })
            .returning({ id: postings.id, externalId: postings.externalId });

         const fetched = await db
            .select({ postingId: postingRaw.postingId, fetchedAt: postingRaw.fetchedAt })
            .from(postingRaw)
            .where(
               inArray(
                  postingRaw.postingId,
                  rows.map((r) => r.id),
               ),
            );
         const lastFetchedAt = new Map(fetched.map((f) => [f.postingId, f.fetchedAt]));
         const refByExternalId = new Map(unique.map((r) => [r.externalId, r]));

         return rows.flatMap(({ id, externalId }) => {
            const ref = refByExternalId.get(externalId)!;
            const last = lastFetchedAt.get(id);
            const cameBack = goneExternalIds.has(externalId);
            const bumped = last && ref.updatedAt !== undefined && ref.updatedAt > last;
            return !last || bumped || cameBack ? [{ postingId: id, ref, cameBack }] : [];
         });
      },

      async listLongUnseen(sourceId, since, limit) {
         const rows = await db
            .select({
               postingId: postings.id,
               externalId: postings.externalId,
               url: postings.url,
            })
            .from(postings)
            .innerJoin(postingRaw, eq(postingRaw.postingId, postings.id))
            .where(
               and(
                  eq(postings.sourceId, sourceId),
                  isNull(postings.goneAt),
                  lt(postings.lastSeenAt, since),
                  lt(postingRaw.fetchedAt, since),
               ),
            )
            .orderBy(postings.lastSeenAt)
            .limit(limit);
         return rows.map(({ postingId, externalId, url }) => ({
            postingId,
            ref: { externalId, url },
         }));
      },

      async saveFetched(postingId, raw, parsed, parserVersion) {
         const page = {
            contentType: raw.contentType,
            body: raw.body,
            contentHash: createHash("sha256").update(raw.body).digest("hex"),
            fetchedAt: raw.fetchedAt,
         };
         await db.transaction(async (tx) => {
            await tx
               .insert(postingRaw)
               .values({ postingId, ...page })
               .onConflictDoUpdate({ target: postingRaw.postingId, set: page });
            await tx
               .update(postings)
               .set({ parsed, parserVersion, url: parsed.url, goneAt: null })
               .where(eq(postings.id, postingId));
         });
      },

      async getParsed(postingId) {
         const [row] = await db
            .select({ parsed: postings.parsed })
            .from(postings)
            .where(eq(postings.id, postingId));
         return row?.parsed ?? undefined;
      },

      async listParsedIds() {
         const rows = await db
            .select({ id: postings.id })
            .from(postings)
            .where(isNotNull(postings.parsed))
            .orderBy(postings.firstSeenAt);
         return rows.map((r) => r.id);
      },

      async listOutdatedIds(sourceId, parserVersion) {
         const rows = await db
            .select({ id: postings.id })
            .from(postings)
            .innerJoin(postingRaw, eq(postingRaw.postingId, postings.id))
            .where(
               and(
                  eq(postings.sourceId, sourceId),
                  or(isNull(postings.parserVersion), lt(postings.parserVersion, parserVersion)),
               ),
            )
            .orderBy(postings.firstSeenAt);
         return rows.map((r) => r.id);
      },

      async getRaw(postingId) {
         const [row] = await db
            .select({
               externalId: postings.externalId,
               url: postings.url,
               fetchedAt: postingRaw.fetchedAt,
               contentType: postingRaw.contentType,
               body: postingRaw.body,
            })
            .from(postingRaw)
            .innerJoin(postings, eq(postings.id, postingRaw.postingId))
            .where(eq(postingRaw.postingId, postingId));
         return row;
      },

      async saveParsed(postingId, parsed, parserVersion) {
         await db.update(postings).set({ parsed, parserVersion }).where(eq(postings.id, postingId));
      },

      async markGone(postingId) {
         await db
            .update(postings)
            .set({ goneAt: sql`now()` })
            .where(and(eq(postings.id, postingId), isNull(postings.goneAt)));
      },

      async listActive(vacancyId) {
         return db
            .select({ id: postings.id, source: postings.sourceId, url: postings.url })
            .from(postings)
            .where(and(eq(postings.vacancyId, vacancyId), isNull(postings.goneAt)))
            .orderBy(desc(postings.lastSeenAt));
      },

      async getLastSeenActiveUrl(sourceId) {
         const [row] = await db
            .select({ url: postings.url })
            .from(postings)
            .where(and(eq(postings.sourceId, sourceId), isNull(postings.goneAt)))
            .orderBy(desc(postings.lastSeenAt))
            .limit(1);
         return row?.url;
      },
   };
}
