import type { ApplyCheck, JobPageResult, SalaryFit } from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { DJINNI_URL, DjinniSessionExpiredError, djinniCookieHeader } from "./session.js";

// "Apply for the job": in the page's HTML from the start, no waiting for it
export const APPLY_BUTTON = "button.js-inbox-toggle-reply-form";
// a page loaded without a valid session offers to sign in
export const SIGN_IN_LINK = "a.sign-in-link";
// on a job applied to already, a card with a link to that dialog replaces the button
const ALREADY_APPLIED = '.card-body a[href^="/my/inbox/"]';
// on a closed job, an alert after the empty apply block: "The job ad is no longer active"
const JOB_CLOSED_ALERT = "#apply_job ~ .alert";
// the requirements the profile fails or may fail, listed in the main column (the sidebar lists all)
const UNMET_REQUIREMENTS = ".col-lg-8 .job-matching-info > li";
// the icon of a failed one, the reason applying is closed: "…#x-circle"; a doubtful one has "#question-circle"
const FAILED_ICON = /#x-circle$/;
// every requirement against the profile, each with an icon: met, doubtful or failed
const SIDEBAR_REQUIREMENTS = "aside .job-matching-info > li";
// the salary one is the only one quoting the profile's expectations: "Your expectations: $3000"
const EXPECTATIONS = /\$\s?\d/;
// its icon when the range covers the expectations or is above them: "…#check2-circle"
const MET_ICON = /#check2-circle$/;

// an ordinary desktop Chrome: the page is loaded as the user's own browser would
const USER_AGENT =
   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const TIMEOUT_MS = 30_000;

/**
 * Whether a job page, loaded with the user's session, lets them apply: it shows the "Apply" button, or
 * why not. The page is in the account's language, so only the markup is read, never the wording.
 */
export function readApplyCheck(html: string): ApplyCheck {
   const $ = cheerio.load(html);
   return applyCheckOnPage($);
}

function applyCheckOnPage($: CheerioAPI): ApplyCheck {
   if ($(APPLY_BUTTON).length > 0) return { canApply: true };
   return { canApply: false, reason: whyNoApplyButton($) };
}

function whyNoApplyButton($: CheerioAPI): string {
   if ($(JOB_CLOSED_ALERT).length > 0) return "The job is no longer active on Djinni";
   if ($(ALREADY_APPLIED).length > 0) return "Already applied to this job on Djinni";
   const listed = $(UNMET_REQUIREMENTS).toArray();
   const failed = listed.filter((li) => FAILED_ICON.test($(li).find("use").attr("href") ?? ""));
   // the failed ones are why; a page that marks none failed still gets its whole list as the reason
   const unmet = (failed.length > 0 ? failed : listed)
      .map((li) => $(li).find("strong").text().replace(/\s+/g, " ").trim()) // "English\n   C1 - Advanced" → "English C1 - Advanced"
      .filter(Boolean);
   if (unmet.length > 0) {
      const requirements = unmet.join(", ");
      return `Your Djinni profile doesn't meet the job's requirements: ${requirements}`;
   }
   return "Djinni shows no Apply button on this job";
}

/**
 * What Djinni shows the user on a job page: whether they can apply and how the salary compares with
 * their expectations, or that the job is gone (closed or removed). Loads the page with their session
 * over plain HTTP, no browser. Throws DjinniSessionExpiredError when the session is missing or over.
 */
export async function checkDjinniJobPage(
   jobUrl: string,
   sessionPath: string,
): Promise<JobPageResult> {
   const cookie = await djinniCookieHeader(sessionPath);
   const response = await fetch(jobUrl, {
      headers: { cookie, "User-Agent": USER_AGENT, Referer: `${DJINNI_URL}/jobs/` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
   });
   if (response.status === 404 || response.status === 410) {
      return { status: "gone" };
   }
   if (response.status !== 200) throw new Error(`djinni ${jobUrl}: HTTP ${response.status}`);
   const html = await response.text();
   const $ = cheerio.load(html);
   if ($(SIGN_IN_LINK).length > 0) throw new DjinniSessionExpiredError();
   if ($(JOB_CLOSED_ALERT).length > 0) return { status: "gone" };
   const check = { applyCheck: applyCheckOnPage($), salaryFit: salaryFitOnPage($) };
   return { status: "ok", check };
}

/** The salary against the profile's expectations, by the icon of its item; undefined when not shown. */
function salaryFitOnPage($: CheerioAPI): SalaryFit | undefined {
   const item = $(SIDEBAR_REQUIREMENTS)
      .toArray()
      .find((li) => EXPECTATIONS.test($(li).text()));
   if (!item) return undefined;
   const icon = $(item).find("use").attr("href") ?? "";
   return MET_ICON.test(icon) ? "fits" : "below_expectations";
}
