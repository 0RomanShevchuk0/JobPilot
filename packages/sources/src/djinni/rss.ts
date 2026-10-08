import type { PostingRef } from "@jobpilot/contracts";
import { XMLParser } from "fast-xml-parser";
import { DJINNI_BASE_URL } from "./site.js";

/** The feed holds the ~100 newest (or bumped) jobs; it takes the same filters as the site search. */
export function rssUrl(keyword?: string): string {
   const url = new URL("/jobs/rss/", DJINNI_BASE_URL);
   if (keyword) url.searchParams.set("primary_keyword", keyword);
   return url.toString();
}

// "https://djinni.co/jobs/850091-strong-middle-…/" → "850091"
const JOB_ID_IN_URL = /\/jobs\/(\d+)-/;

export function parseRss(xml: string): PostingRef[] {
   const doc = new XMLParser().parse(xml);
   const items: unknown = doc?.rss?.channel?.item ?? [];
   const list = (Array.isArray(items) ? items : [items]) as { link?: string; pubDate?: string }[];

   const refs: PostingRef[] = [];
   for (const item of list) {
      const id = item.link && JOB_ID_IN_URL.exec(item.link)?.[1];
      if (!item.link || !id) continue;
      refs.push({
         externalId: id,
         url: item.link,
         updatedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
   }
   return refs;
}
