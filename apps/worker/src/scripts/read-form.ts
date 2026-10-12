// Reads the application form of one job with the saved session and prints its fields.
// Nothing is filled in or sent. Usage: pnpm read-form <source> <job url> [file to save the form's HTML to]
import { readSessionFile } from "@jobpilot/sources";
import { writeFile } from "node:fs/promises";
import { sessionPath } from "../config.js";
import { findSource, sources } from "../sources.js";
import { scriptUserId } from "./script-user.js";

const [source, jobUrl, htmlPath] = process.argv.slice(2);
const entry = source ? findSource(source) : undefined;
if (!entry || !jobUrl) {
   const known = sources.map((s) => s.adapter.source).join(", ");
   throw new Error(`usage: pnpm read-form <source> <job url> [html file], source one of: ${known}`);
}

const userId = await scriptUserId();
const path = sessionPath(userId, entry.adapter.source);
const session = await readSessionFile(path, entry.adapter.name);
const form = await entry.adapter.account.readApplyForm(jobUrl, session);
const { html, ...fields } = form;
console.log(JSON.stringify(fields, null, 2));
if (htmlPath) await writeFile(htmlPath, html);
