import type { FailedFeed } from "@jobpilot/contracts";
import type { Redis } from "ioredis";

// one run's blip (a 502, a dropped connection) is gone by the next run; this many runs in a row,
// about an hour and a half at the default 30 minutes, is a feed down for good
const RUNS_IN_A_ROW_DOWN = 3;
// a feed no category asks for any more isn't read again: its count goes after a day
const COUNT_TTL_SECONDS = 24 * 60 * 60;

const failedRunsKey = (url: string) => `discover:feed-failed-runs:${url}`;

/** A feed that didn't answer, with how many runs in a row it hasn't. */
export interface FeedFailure extends FailedFeed {
   runsInARow: number;
   /** failed long enough in a row to be down for good, not a blip */
   down: boolean;
}

/**
 * Stores a discover run's outcome per feed: an answered one starts from zero again, a failed one
 * counts one more run in a row. Returns the failed ones with their counts.
 */
export async function recordFeedRuns(
   redis: Redis,
   answered: string[],
   failed: FailedFeed[],
): Promise<FeedFailure[]> {
   if (answered.length > 0) await redis.del(...answered.map(failedRunsKey));
   const failures: FeedFailure[] = [];
   for (const feed of failed) {
      const key = failedRunsKey(feed.url);
      const runsInARow = await redis.incr(key);
      await redis.expire(key, COUNT_TTL_SECONDS);
      failures.push({ ...feed, runsInARow, down: runsInARow >= RUNS_IN_A_ROW_DOWN });
   }
   return failures;
}
