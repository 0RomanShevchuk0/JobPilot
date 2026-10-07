import type { JobPageResult } from "./match.js";
import type { NormalizedPosting, RawContentType } from "./posting.js";

/** What discover() finds on a source listing: enough to decide whether the page is worth fetching. */
export interface PostingRef {
   externalId: string;
   url: string;
   updatedAt?: Date;
}

export interface RawPosting {
   externalId: string;
   url: string;
   fetchedAt: Date;
   contentType: RawContentType;
   body: string;
}

export type FetchResult = { status: "ok"; raw: RawPosting } | { status: "gone" };

export interface DiscoverParams {
   /** Specializations to look for, e.g. "Node.js". Each adapter maps them to its own filters. Empty = everything. */
   keywords?: string[];
}

/** What the platform does under the user's own account on the source. */
export interface SourceAccount {
   /** Interactive: the user logs in, the session is saved to sessionPath for later runs. */
   login(sessionPath: string): Promise<void>;
   /**
    * What the job page shows the logged-in user: whether they can apply, the salary against their
    * expectations there; gone when the job is closed or removed. Throws SessionExpiredError without
    * a valid session.
    */
   checkJobPage(url: string, sessionPath: string): Promise<JobPageResult>;
}

/**
 * Implemented once per source. The platform only talks to sources through this interface.
 * Rate limiting and retries are the caller's job: every method makes at most the requests it needs, once.
 */
export interface SourceAdapter {
   readonly source: string;
   /** Bump when parse() output changes, so stored postings can be found and re-parsed from posting_raw. */
   readonly parserVersion: number;
   discover(params: DiscoverParams): Promise<PostingRef[]>;
   fetch(ref: PostingRef): Promise<FetchResult>;
   /** Pure: no network. Must never guess — a field it is not sure about stays undefined. */
   parse(raw: RawPosting): NormalizedPosting;
   readonly account: SourceAccount;
}
