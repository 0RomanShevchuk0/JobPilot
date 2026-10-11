// Tries every user's session on every source now and records whether it works, then exits: run it
// after logging in again (and copying the session to the server) for the warning in the web to go away.
import { createDatabase } from "@jobpilot/db";
import { config, loginHint } from "../config.js";
import { probeSessions } from "../session-probe.js";
import { sources } from "../sources.js";

const database = createDatabase(config.databaseUrl);

for (const { adapter } of sources) {
   const results = await probeSessions(adapter.source, database);
   if (results.length === 0) console.log(`${adapter.source}: nobody searches there`);
   for (const { userId, result } of results) {
      const hint = result === "logged out" ? ` — ${loginHint(adapter.source)}` : "";
      console.log(`${adapter.source}, user ${userId}: ${result}${hint}`);
   }
}

await database.close();
