import type { ApplyForm, FillOutcome, FillValue } from "./application.js";
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
   /**
    * Opens the job's application form under the account and reads it; nothing is filled in or sent.
    * Throws SessionExpiredError, or CannotApplyError when the site offers no form (applied already,
    * the job is closed, the profile doesn't meet its requirements).
    */
   readApplyForm(url: string, sessionPath: string): Promise<ApplyForm>;
   /**
    * Opens the job's application form in a visible browser on this machine, fills in the answers and
    * hands over to the user, who sends it or closes the window: never sends anything itself. Resolves
    * once the form was sent or the window closed. Throws SessionExpiredError or CannotApplyError.
    */
   fillApplicationForm(
      url: string,
      sessionPath: string,
      answers: FillValue[],
   ): Promise<FillOutcome>;
   /** Pause between automated form opens, ms, picked at random: one account shouldn't look like a bot. */
   readonly formOpenGapMs: { min: number; max: number };
}

/**
 * Implemented once per source. The platform only talks to sources through this interface.
 * The adapter says how often its site may be asked (fetchIntervalMs, account.formOpenGapMs); keeping to it
 * and retrying are the caller's job: every method makes at most the requests it needs, once.
 */
export interface SourceAdapter {
   readonly source: string;
   /** the job site's name to show, e.g. "Djinni" */
   readonly name: string;
   readonly baseUrl: string;
   /** Bump when parse() output changes, so stored postings can be found and re-parsed from posting_raw. */
   readonly parserVersion: number;
   /** At most one fetch() per this many ms, to stay polite and avoid bans. */
   readonly fetchIntervalMs: number;
   discover(params: DiscoverParams): Promise<PostingRef[]>;
   fetch(ref: PostingRef): Promise<FetchResult>;
   /** Pure: no network. Must never guess — a field it is not sure about stays undefined. */
   parse(raw: RawPosting): NormalizedPosting;
   readonly account: SourceAccount;
}
