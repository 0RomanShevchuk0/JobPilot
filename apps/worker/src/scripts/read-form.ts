// Reads the application form of one job with a user's saved session and prints its fields: what the
// parser sees on the live page, a form's HTML saved for a fixture. Nothing is filled in or sent.
// Usage: pnpm read-form <source> <job url> <user's email> [file to save the form's HTML to]
import { createDatabase } from "@jobpilot/db";
import { writeFile } from "node:fs/promises";
import { config } from "../config.js";
import { loadSession } from "../session.js";
import { findSource, sources, type SourceEntry } from "../sources.js";

const [source, jobUrl, email, htmlPath] = process.argv.slice(2);
const entry = source ? findSource(source) : undefined;
if (!entry || !jobUrl || !email) {
   const known = sources.map((s) => s.adapter.source).join(", ");
   throw new Error(
      `usage: pnpm read-form <source> <job url> <user's email> [html file], source one of: ${known}`,
   );
}

const database = createDatabase(config.databaseUrl);
const session = await readSessionOf(email, entry).finally(() => database.close());
const form = await entry.adapter.account.readApplyForm(jobUrl, session);
const { html, ...fields } = form;
console.log(JSON.stringify(fields, null, 2));
if (htmlPath) await writeFile(htmlPath, html);

/** The user's session on the source, as the worker has it: no such user, no session. */
async function readSessionOf(userEmail: string, sourceEntry: SourceEntry) {
   const userId = await database.users.findIdByEmail(userEmail);
   if (!userId) throw new Error(`No user ${userEmail}: they sign in to the web first`);
   return loadSession(database, userId, sourceEntry);
}
