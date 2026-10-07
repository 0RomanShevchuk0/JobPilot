import { SourceIds, type PostingRef, type SourceAdapter } from "@jobpilot/contracts";
import { getText } from "../http.js";
import { isClosedPage, parseJobPage } from "./job-page.js";
import { parseRss, rssUrl } from "./rss.js";

export function createDouAdapter(): SourceAdapter {
   return {
      source: SourceIds.dou,
      parserVersion: 1,

      /** keywords are DOU categories ("Node.js", "Front End"): the feed's only useful filter */
      async discover({ keywords }) {
         const urls = keywords?.length ? keywords.map((k) => rssUrl(k)) : [rssUrl()];
         const byId = new Map<string, PostingRef>();
         // one feed per category; a job in several feeds is returned once
         for (const url of urls) {
            const res = await getText(url);
            if (res.status !== 200) throw new Error(`dou RSS ${url}: HTTP ${res.status}`);
            for (const ref of parseRss(res.body)) byId.set(ref.externalId, ref);
         }
         return [...byId.values()];
      },

      async fetch(ref) {
         const res = await getText(ref.url);
         if (res.status === 404 || res.status === 410) return { status: "gone" };
         if (res.status !== 200) throw new Error(`dou ${ref.url}: HTTP ${res.status}`);
         if (isClosedPage(res.body)) return { status: "gone" };
         return {
            status: "ok",
            raw: {
               externalId: ref.externalId,
               url: res.url,
               fetchedAt: new Date(),
               contentType: "html",
               body: res.body,
            },
         };
      },

      parse: parseJobPage,
   };
}
