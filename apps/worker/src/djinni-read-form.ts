// Reads the application form of one Djinni job with the saved session and prints its fields.
// Nothing is filled in or sent. Usage: pnpm djinni:read-form <job url> [file to save the form's HTML to]
import { writeFile } from "node:fs/promises";
import { launchBrowser, openDjinniContext, readDjinniApplyForm } from "@jobpilot/sources";
import { SourceIds } from "@jobpilot/contracts";
import { sessionPath } from "./config.js";

const [jobUrl, htmlPath] = process.argv.slice(2);
if (!jobUrl) throw new Error("usage: pnpm djinni:read-form <job url> [html file]");

const browser = await launchBrowser();
try {
   const context = await openDjinniContext(browser, sessionPath(SourceIds.djinni));
   const form = await readDjinniApplyForm(context, jobUrl);
   const { html, ...fields } = form;
   console.log(JSON.stringify(fields, null, 2));
   if (htmlPath) await writeFile(htmlPath, form.html);
} finally {
   await browser.close();
}
