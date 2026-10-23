import { EXTENSION_IDS } from "@jobpilot/contracts";
import { createHash } from "node:crypto";
import { defineConfig } from "wxt";
import { jobSitePages } from "./shared/job-sites.js";

// the monorepo's .env: the API's and the web app's addresses, as the browser reaches them (the domain on
// the server). Built into the extension: after changing one, build it again
if (!process.env.API_URL) process.loadEnvFile("../../.env");

function required(name: string): string {
   const value = process.env[name];
   if (!value) throw new Error(`Missing environment variable ${name}`);
   return value;
}

// the API, its /api included
const apiUrl = required("API_URL");
// the web app's origin, the one the extension takes messages from
const webOrigin = new URL(required("WEB_URL")).origin;

// the public halves of two RSA keys, one for each build (not secrets; the private halves aren't kept,
// nothing needs them). Chrome derives the id from the key, so a "Load unpacked" copy has the same id on
// every machine, the one the API's CORS lets in and the web app talks to; without one the id comes from
// the folder's path, different for each. Two keys, two ids: the server's build and the dev one stay
// loaded side by side
const BUILD_KEYS = {
   production:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4gh1Pv+NaBZHw3cZ+DEFmFFFhmtNULSF0XGVBoYMJKipmMnRFlRqlfVD4mAxK4Utb4ihJgRkuaHCxFAsHKi+0HXxgFmXxX7ZNxuf7glv/zdtkjM2qr5vArwPZ0o7xj7JHUt9ALqgBQ2dS/vTzbbhWdQ/ibKbnIaKYShgzUI73Z81wNldq4uNBzt/4vm6IYyICip4WVlFrR/t5XX3K3IHdhlQmwb76oYm/17QTGqqWmtfnWSCUC+QRUTmQFPofdZgWPjDwW170xKvzZJZ0X3nOebAhxvVvedWVlvMXjBWfT3muq4DyUINNWoLThpOjVReOzwZ9du+tIBE11sPpIFHAwIDAQAB",
   development:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1aayHAOUZ/iLeWdXZDT3V/J5VRikvMrYyJDeGe89HiVqPYi2JeM2UknUxXkihTZJJymxYKPtHrycUt/SFo1Tv3yss6SeMPJfjfe8Aj360N/AhsNUDrL5DF2W5UfDuE3yWq7Yhuv9e830dka60vLtSuLC3yAL7FU2qA+CVC2oKRwG6ouf6L19++19zsgmU2bHsfBEQyULJWb8uaKvXR+hWkNHh6VoAnvQkqr2UWQEgm7GL05nA0Ib1tFIU/0r/vF9kD3UYd0Qe8EykxnLKMgHvRHF0IK5q3qxbEmdndlJnqALUcBwGZpPzqGkdaWybjFBsyF4Bo4MQwPNUDy+y8FyIwIDAQAB",
} as const;

// the id Chrome gives a key: the first 32 hex digits of its SHA-256, 0–f spelled a–p ("3f…" → "dp…")
function idOfKey(key: string): string {
   return createHash("sha256")
      .update(Buffer.from(key, "base64"))
      .digest("hex")
      .slice(0, 32)
      .replace(/[0-9a-f]/g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)));
}

for (const build of ["production", "development"] as const) {
   const id = idOfKey(BUILD_KEYS[build]);
   if (id !== EXTENSION_IDS[build]) {
      throw new Error(`EXTENSION_IDS.${build} is not its key's id: ${id}`);
   }
}

export default defineConfig({
   // no auto-imports: imported by hand from their own modules (wxt/browser…), like everything else
   imports: false,
   // with the other packages' builds: gitignored, prettier skips it, turbo caches it.
   // `pnpm dev` writes dist/chrome-mv3-dev: load that folder in chrome://extensions
   outDir: "dist",
   // the dev build's CSP lets in scripts from this port only: a second `pnpm dev` fails instead of
   // moving to the next port, where the loaded extension couldn't run its scripts
   dev: { server: { port: 3399, strictPort: true } },
   // in the code: import.meta.env.API_URL, the API; import.meta.env.WEB_URL, the web app
   vite: () => ({
      define: {
         "import.meta.env.API_URL": JSON.stringify(apiUrl),
         "import.meta.env.WEB_URL": JSON.stringify(webOrigin),
      },
   }),
   // `wxt build` is the server's build, `wxt` (pnpm dev) this machine's: its own key, and a name to tell
   // the two apart in chrome://extensions
   manifest: ({ command }) => ({
      name: command === "build" ? "JobPilot" : "JobPilot (dev)",
      key: command === "build" ? BUILD_KEYS.production : BUILD_KEYS.development,
      // cookies: the job sites' cookies, httpOnly ones too, the user's session there;
      // storage and alarms: a session the API didn't get is kept and sent again later;
      // scripting: the form is filled in on the job page, in the tab opened for the application only;
      // webNavigation: told when a job site's page has loaded, to fill the form in;
      // webRequest: sees (only sees, changes nothing) the site's answer when the user sends the form
      permissions: ["cookies", "storage", "alarms", "scripting", "webNavigation", "webRequest"],
      // the job sites' pages: their cookies, the job pages with the form (from @jobpilot/sources)
      host_permissions: jobSitePages,
      // the web app may talk to the extension: whether it is there, and which application to fill in
      externally_connectable: { matches: [`${webOrigin}/*`] },
   }),
});
