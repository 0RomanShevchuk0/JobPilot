import { createHash } from "node:crypto";
import { defineConfig } from "wxt";
import { jobSitePages } from "./utils/job-sites.js";

// the monorepo's .env: the API and the web app listen on the ports there, the extension talks to them.
// Built into the extension: after changing a port, build it again
if (!process.env.API_PORT) process.loadEnvFile("../../.env");

function required(name: string): string {
   const value = process.env[name];
   if (!value) throw new Error(`Missing environment variable ${name}`);
   return value;
}

const apiUrl = `http://localhost:${required("API_PORT")}`;
const webOrigin = `http://localhost:${required("WEB_PORT")}`;

// the public half of an RSA key (not a secret; the private half isn't kept, nothing needs it): Chrome
// derives the id from it, so a "Load unpacked" copy has the same id on every machine, the one the API's
// CORS lets in and the web app talks to. Without it the id comes from the folder's path, different for each
const EXTENSION_KEY =
   "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4gh1Pv+NaBZHw3cZ+DEFmFFFhmtNULSF0XGVBoYMJKipmMnRFlRqlfVD4mAxK4Utb4ihJgRkuaHCxFAsHKi+0HXxgFmXxX7ZNxuf7glv/zdtkjM2qr5vArwPZ0o7xj7JHUt9ALqgBQ2dS/vTzbbhWdQ/ibKbnIaKYShgzUI73Z81wNldq4uNBzt/4vm6IYyICip4WVlFrR/t5XX3K3IHdhlQmwb76oYm/17QTGqqWmtfnWSCUC+QRUTmQFPofdZgWPjDwW170xKvzZJZ0X3nOebAhxvVvedWVlvMXjBWfT3muq4DyUINNWoLThpOjVReOzwZ9du+tIBE11sPpIFHAwIDAQAB";

// the id Chrome gives the key: the first 32 hex digits of its SHA-256, 0–f spelled a–p ("3f…" → "dp…")
const extensionId = createHash("sha256")
   .update(Buffer.from(EXTENSION_KEY, "base64"))
   .digest("hex")
   .slice(0, 32)
   .replace(/[0-9a-f]/g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)));
if (extensionId !== required("EXTENSION_ID")) {
   throw new Error(`EXTENSION_ID in .env is not this key's id: ${extensionId}`);
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
   manifest: {
      name: "JobPilot",
      key: EXTENSION_KEY,
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
   },
});
