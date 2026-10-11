// Tries the session of every source now and records whether it works, then exits: run it after
// logging in again (and copying the session to the server) for the warning in the web to go away.
import { createDatabase } from "@jobpilot/db";
import { config, loginHint } from "../config.js";
import { probeSession } from "../session-probe.js";
import { sources } from "../sources.js";

const database = createDatabase(config.databaseUrl);

for (const { adapter } of sources) {
   const result = await probeSession(adapter.source, database);
   const hint = result === "logged out" ? ` — ${loginHint(adapter.source)}` : "";
   console.log(`${adapter.source}: ${result}${hint}`);
}

await database.close();
