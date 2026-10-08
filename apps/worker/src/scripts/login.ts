// Logs in to a source under the user's own account and saves the session for the worker.
// Usage: pnpm login:<source>, e.g. pnpm login:djinni. Run it again whenever the source logs you out.
// Not `pnpm login`: that is pnpm's own command, logging in to the npm registry.
import { sessionPath } from "../config.js";
import { findSource, sources } from "../sources.js";

const source = process.argv[2];
const entry = source ? findSource(source) : undefined;
if (!entry) {
   const known = sources.map((s) => s.adapter.source).join(", ");
   throw new Error(`usage: pnpm login:<source>, one of: ${known}`);
}

const path = sessionPath(entry.adapter.source);
console.log(`Log in to ${entry.adapter.name} in the browser window that opens…`);
await entry.adapter.account.login(path);
console.log(`logged in, session saved to ${path}`);
