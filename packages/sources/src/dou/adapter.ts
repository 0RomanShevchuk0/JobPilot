import {
   SessionExpiredError,
   SourceIds,
   type PostingRef,
   type SourceAdapter,
} from "@jobpilot/contracts";
import { getText } from "../http.js";
import { isClosedPage, parseJobPage } from "./job-page.js";
import { DOU_BASE_URL, parseRss, rssUrl } from "./rss.js";

export function createDouAdapter(): SourceAdapter {
   return {
      source: SourceIds.dou,
      name: "DOU",
      baseUrl: DOU_BASE_URL,
      parserVersion: 1,
      fetchIntervalMs: 3000,

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

      // not implemented yet: whatever needs the account fails until it is
      account: {
         login: () => Promise.reject(new Error("dou: logging in is not implemented yet")),
         // there is no DOU session without a login: the check is skipped, as for any source not logged in
         checkJobPage: () => Promise.reject(new SessionExpiredError(SourceIds.dou)),
         readApplyForm: () => Promise.reject(new Error("dou: applying is not implemented yet")),
         fillApplicationForm: () =>
            Promise.reject(new Error("dou: applying is not implemented yet")),
         // not measured on DOU yet: Djinni's pace
         formOpenGapMs: { min: 60_000, max: 150_000 },
      },
   };
}
