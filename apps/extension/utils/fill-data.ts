import type { FillAnswer } from "@jobpilot/contracts";

/*
 * What the background hands the script it injects into the job page, and what it gets back. Passed
 * between them as JSON: a file goes as base64, the script makes a File of it there.
 */

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

/** The name the injected script registers its fill function under, in the extension's own world there. */
export const FILL_FUNCTION = "jobpilotFillApplication";
