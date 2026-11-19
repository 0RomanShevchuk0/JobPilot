import type { PostingRef } from "@jobpilot/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFeeds } from "./feeds.js";

// a feed's body here is its postings' ids, comma-separated
const parseIds = (body: string): PostingRef[] =>
   body.split(",").map((id) => ({ externalId: id, url: `https://site.test/jobs/${id}/` }));

/** Answers each feed URL as given: a status and body, or a network error. */
function answer(byUrl: Record<string, { status: number; body: string } | Error>) {
   vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
         const reply = byUrl[url];
         if (!reply || reply instanceof Error) throw reply ?? new Error(`no answer for ${url}`);
         return new Response(reply.body, { status: reply.status });
      }),
   );
}

afterEach(() => vi.unstubAllGlobals());

describe("readFeeds", () => {
   it("keeps the feeds that answered when one fails", async () => {
      answer({
         "https://site.test/feed?c=a": { status: 200, body: "1,2" },
         "https://site.test/feed?c=b": { status: 503, body: "" },
         "https://site.test/feed?c=c": { status: 200, body: "2,3" },
      });
      const result = await readFeeds(
         "site RSS",
         ["https://site.test/feed?c=a", "https://site.test/feed?c=b", "https://site.test/feed?c=c"],
         parseIds,
      );
      // 2 is in two feeds: once
      expect(result.refs.map((r) => r.externalId)).toEqual(["1", "2", "3"]);
      expect(result.answeredFeeds).toEqual([
         "https://site.test/feed?c=a",
         "https://site.test/feed?c=c",
      ]);
      expect(result.failedFeeds).toEqual([
         {
            url: "https://site.test/feed?c=b",
            message: "site RSS https://site.test/feed?c=b: HTTP 503",
         },
      ]);
   });

   it("counts a feed that doesn't answer at all as failed too", async () => {
      answer({
         "https://site.test/feed?c=a": { status: 200, body: "1" },
         "https://site.test/feed?c=b": new Error("fetch failed"),
      });
      const result = await readFeeds(
         "site RSS",
         ["https://site.test/feed?c=a", "https://site.test/feed?c=b"],
         parseIds,
      );
      expect(result.failedFeeds).toEqual([
         {
            url: "https://site.test/feed?c=b",
            message: "site RSS https://site.test/feed?c=b: fetch failed",
         },
      ]);
   });

   it("throws when no feed answered: the site is down", async () => {
      answer({ "https://site.test/feed?c=a": { status: 503, body: "" } });
      await expect(readFeeds("site RSS", ["https://site.test/feed?c=a"], parseIds)).rejects.toThrow(
         "site RSS https://site.test/feed?c=a: HTTP 503",
      );
   });
});
