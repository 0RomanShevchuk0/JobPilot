import type { PostingRef } from "@jobpilot/contracts";
import { XMLParser } from "fast-xml-parser";

export const DOU_BASE_URL = "https://jobs.dou.ua";

/**
 * The feed holds the 25 newest (or bumped) jobs of a category, 50 without one; it takes the same filters
 * as the site search. Unfiltered it covers only an hour or two, so jobs are read by category.
 */
export function rssUrl(category?: string): string {
   const url = new URL("/vacancies/feeds/", DOU_BASE_URL);
   if (category) url.searchParams.set("category", category);
   return url.toString();
}

// "https://jobs.dou.ua/companies/sombra/vacancies/375739/?utm_source=jobsrss" → "375739"
const JOB_ID_IN_URL = /\/vacancies\/(\d+)\//;

export function parseRss(xml: string): PostingRef[] {
   const doc = new XMLParser().parse(xml);
   const items: unknown = doc?.rss?.channel?.item ?? [];
   const list = (Array.isArray(items) ? items : [items]) as { link?: string; pubDate?: string }[];

   const refs: PostingRef[] = [];
   for (const item of list) {
      const id = item.link && JOB_ID_IN_URL.exec(item.link)?.[1];
      if (!item.link || !id) continue;
      // the job's own URL: the company slug in it is required (another slug is a 404), utm_source is not
      const url = new URL(item.link);
      url.search = "";
      refs.push({
         externalId: id,
         url: url.toString(),
         updatedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
   }
   return refs;
}
