// Tries every user's session on every source now and records whether it works, then exits: run it
// after logging in to a site again (the extension sends the session) for the warning in the web to go
// away without waiting for the next discover.
import { createDatabase } from "@jobpilot/db";
import { config, LOGIN_HINT } from "../config.js";
import { probeSessions } from "../session-probe.js";
import { sources } from "../sources.js";

const database = createDatabase(config.databaseUrl);

for (const { adapter } of sources) {
   const results = await probeSessions(adapter.source, database);
   if (results.length === 0) console.log(`${adapter.source}: nobody searches there`);
   for (const { userId, result } of results) {
      const hint = result === "logged out" ? ` — ${LOGIN_HINT}` : "";
      console.log(`${adapter.source}, user ${userId}: ${result}${hint}`);
   }
}

await database.close();
