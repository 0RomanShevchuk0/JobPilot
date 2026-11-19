import type { DiscoverResult, FailedFeed, PostingRef } from "@jobpilot/contracts";
import { getText } from "./http.js";

/**
 * Reads a discover run's feeds one by one, each on its own: one that answers with an error, or not at
 * all, is left out with why, and the rest still count. A posting in several feeds is returned once.
 * Throws when none answered: the site is down, the run is the queue's to retry.
 */
export async function readFeeds(
   /** what the failures start with: "dou RSS" */
   label: string,
   urls: string[],
   parseFeed: (body: string) => PostingRef[],
): Promise<DiscoverResult> {
   const byId = new Map<string, PostingRef>();
   const answeredFeeds: string[] = [];
   const failedFeeds: FailedFeed[] = [];
   for (const url of urls) {
      try {
         const res = await getText(url);
         if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
         for (const ref of parseFeed(res.body)) byId.set(ref.externalId, ref);
         answeredFeeds.push(url);
      } catch (err) {
         failedFeeds.push({ url, message: `${label} ${url}: ${(err as Error).message}` });
      }
   }
   if (failedFeeds.length === urls.length) {
      throw new Error(failedFeeds.map((feed) => feed.message).join("; "));
   }
   return { refs: [...byId.values()], answeredFeeds, failedFeeds };
}
