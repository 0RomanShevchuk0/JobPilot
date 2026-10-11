// Logs in to a source under the user's own account and saves the session for the worker, in the
// folder of the user in USER_EMAIL: everything the worker does on the site for them goes with it.
// Usage: pnpm login:<source>, e.g. pnpm login:djinni. Run it again whenever the source logs you out.
// Not `pnpm login`: that is pnpm's own command, logging in to the npm registry.
import { sessionPath } from "../config.js";
import { findSource, sources } from "../sources.js";
import { scriptUserId } from "./script-user.js";

const source = process.argv[2];
const entry = source ? findSource(source) : undefined;
if (!entry) {
   const known = sources.map((s) => s.adapter.source).join(", ");
   throw new Error(`usage: pnpm login:<source>, one of: ${known}`);
}

const userId = await scriptUserId();
const path = sessionPath(userId, entry.adapter.source);
console.log(`Log in to ${entry.adapter.name} in the browser window that opens…`);
await entry.adapter.account.login(path);
const file = `.data/sessions/${userId}/${entry.adapter.source}.json`;
console.log(`logged in, session saved to ${file}`);
console.log(`for the worker on the server, copy it to the same place there: /opt/jobpilot/${file}`);
