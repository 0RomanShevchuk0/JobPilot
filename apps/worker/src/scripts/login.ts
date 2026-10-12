// Logs in to a source under the user's own account and saves the session for the worker, in the
// folder of the user in USER_EMAIL: everything the worker does on the site for them goes with it.
// The server's worker gets it from the database, encrypted: only the server can read it.
// Usage: pnpm login:<source>, e.g. pnpm login:djinni. Run it again whenever the source logs you out.
// Not `pnpm login`: that is pnpm's own command, logging in to the npm registry.
import { createDatabase } from "@jobpilot/db";
import { encryptSession } from "@jobpilot/sources";
import { readFile } from "node:fs/promises";
import { config, SESSION_PUBLIC_KEY, sessionPath } from "../config.js";
import { findSource, sources } from "../sources.js";
import { scriptUserId } from "./script-user.js";

const source = process.argv[2];
const entry = source ? findSource(source) : undefined;
if (!entry) {
   const known = sources.map((s) => s.adapter.source).join(", ");
   throw new Error(`usage: pnpm login:<source>, one of: ${known}`);
}
if (!SESSION_PUBLIC_KEY) {
   throw new Error(
      "SESSION_PUBLIC_KEY in config.ts is empty: run pnpm session-keys:generate first",
   );
}

const userId = await scriptUserId();
const path = sessionPath(userId, entry.adapter.source);
console.log(`Log in to ${entry.adapter.name} in the browser window that opens…`);
await entry.adapter.account.login(path);

// the database only after the login: it can take minutes, an idle connection may drop meanwhile
const session = await readFile(path, "utf8");
const encrypted = await encryptSession(session, SESSION_PUBLIC_KEY);
const database = createDatabase(config.databaseUrl);
try {
   await database.sourceSessions.saveSession(userId, entry.adapter.source, encrypted);
} finally {
   await database.close();
}
const file = `.data/sessions/${userId}/${entry.adapter.source}.json`;
console.log(`logged in: session saved to ${file}, and encrypted to the database for the server`);
