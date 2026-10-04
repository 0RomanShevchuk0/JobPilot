// Logs in to Djinni and saves the session for the worker. Run it again whenever Djinni logs you out.
// Google Chrome opens with a fresh temporary profile: log in to Djinni there, then quit that Chrome (Cmd+Q).
// Only the Djinni cookies are kept; the temporary profile, with any Google session in it, is deleted.
import { loginToDjinni } from "@jobpilot/apply";
import { config } from "./config.js";

console.log("Log in to Djinni in the Chrome window that opens, then quit that Chrome (Cmd+Q)…");
await loginToDjinni(config.djinniSessionPath);
console.log(`logged in, session saved to ${config.djinniSessionPath}`);
