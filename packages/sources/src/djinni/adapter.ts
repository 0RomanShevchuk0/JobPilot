import type { PostingRef, SourceAdapter } from "@jobpilot/contracts";
import { getText } from "../http.js";
import { checkDjinniJobPage } from "./account-page.js";
import { readDjinniApplyForm } from "./apply-form.js";
import { fillDjinniApplication } from "./fill.js";
import { isClosedPage, parseJobPage } from "./job-page.js";
import { parseRss, rssUrl } from "./rss.js";
import { loginToDjinni } from "./session.js";
import { DJINNI_BASE_URL, DJINNI_ID, DJINNI_NAME } from "./site.js";

export function createDjinniAdapter(): SourceAdapter {
   return {
      source: DJINNI_ID,
      name: DJINNI_NAME,
      baseUrl: DJINNI_BASE_URL,
      parserVersion: 3,
      fetchIntervalMs: 3000,

      async discover({ keywords }) {
         const urls = keywords?.length ? keywords.map((k) => rssUrl(k)) : [rssUrl()];
         const byId = new Map<string, PostingRef>();
         // one feed per keyword; a job matching several keywords is returned once
         for (const url of urls) {
            const res = await getText(url);
            if (res.status !== 200) throw new Error(`djinni RSS ${url}: HTTP ${res.status}`);
            for (const ref of parseRss(res.body)) byId.set(ref.externalId, ref);
         }
         return [...byId.values()];
      },

      async fetch(ref) {
         const res = await getText(ref.url);
         if (res.status === 404 || res.status === 410) return { status: "gone" };
         if (res.status !== 200) throw new Error(`djinni ${ref.url}: HTTP ${res.status}`);
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

      account: {
         login: loginToDjinni,
         checkJobPage: checkDjinniJobPage,
         readApplyForm: readDjinniApplyForm,
         fillApplicationForm: fillDjinniApplication,
         // like a person going through jobs: a minute or two between forms
         formOpenGapMs: { min: 60_000, max: 150_000 },
      },
   };
}
