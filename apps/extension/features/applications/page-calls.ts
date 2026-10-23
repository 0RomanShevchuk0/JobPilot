import type { FillAnswer } from "@jobpilot/contracts";
import { browserSites, type SitePage } from "@jobpilot/sources/page";

/*
 * What the script injected into an application's job page (features/applications/page, injected as
 * entrypoints/application-page.ts) does for the background (in-tab.ts): fills the form in, tells
 * whether the site took it, shows the user how it goes. What goes in and out passes as JSON: a file
 * goes as base64, the script makes a File of it there.
 */

/** The names the page script registers its functions under, in the extension's own world there. */
export const PAGE_FUNCTIONS = {
   /** (FillOnPage) → FillOnPageResult */
   fill: "jobpilotFillApplication",
   /** (source) → whether the page the site answered the sent form with shows it taken */
   isFormAccepted: "jobpilotIsFormAccepted",
   /** (PageNotice) → shows it over the page, in place of the one before */
   showNotice: "jobpilotShowNotice",
} as const;

/**
 * A note to the user over the job page: how the application is going. "progress": something under
 * way, with a spinner, until the next note replaces it.
 */
export interface PageNotice {
   tone: "progress" | "info" | "success" | "warning" | "error";
   text: string;
}

/** A file to attach, as the API gave it. */
export interface FileToAttach {
   fileName: string;
   type: string;
   base64: string;
}

/** One answer for the page: the CV comes along as the file itself. */
export type PageAnswer =
   Exclude<FillAnswer, { kind: "file" }> | { name: string; kind: "file"; file: FileToAttach };

/** What the script on the job page fills in. */
export interface FillOnPage {
   /** the job site's id: how its page is filled in */
   source: string;
   answers: PageAnswer[];
}

/** How filling the page went: the form is filled in and waits for the user, or why it couldn't be. */
export type FillOnPageResult = { ok: true } | { ok: false; reason: string };

/** How a job site's page is worked with, by the source's id. */
export function findSitePage(source: string): SitePage | undefined {
   return browserSites.find((site) => site.source === source)?.page;
}
