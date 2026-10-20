import { defineConfig } from "wxt";

export default defineConfig({
   // no auto-imports: imported by hand from their own modules (wxt/browser…), like everything else
   imports: false,
   // with the other packages' builds: gitignored, prettier skips it, turbo caches it.
   // `pnpm dev` writes dist/chrome-mv3-dev: load that folder in chrome://extensions
   outDir: "dist",
   manifest: {
      name: "JobPilot",
      // the public half of an RSA key (not a secret; the private half isn't kept, nothing needs it):
      // Chrome derives the id from it, so a "Load unpacked" copy has the same id on every machine, the
      // one the API's CORS lets in. Without it the id comes from the folder's path, different for each
      key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4gh1Pv+NaBZHw3cZ+DEFmFFFhmtNULSF0XGVBoYMJKipmMnRFlRqlfVD4mAxK4Utb4ihJgRkuaHCxFAsHKi+0HXxgFmXxX7ZNxuf7glv/zdtkjM2qr5vArwPZ0o7xj7JHUt9ALqgBQ2dS/vTzbbhWdQ/ibKbnIaKYShgzUI73Z81wNldq4uNBzt/4vm6IYyICip4WVlFrR/t5XX3K3IHdhlQmwb76oYm/17QTGqqWmtfnWSCUC+QRUTmQFPofdZgWPjDwW170xKvzZJZ0X3nOebAhxvVvedWVlvMXjBWfT3muq4DyUINNWoLThpOjVReOzwZ9du+tIBE11sPpIFHAwIDAQAB",
      // cookies: the job sites' cookies, httpOnly ones too, the user's session there;
      // storage and alarms: a session the API didn't get is kept and sent again later
      permissions: ["cookies", "storage", "alarms"],
      host_permissions: ["https://djinni.co/*", "https://dou.ua/*"],
   },
});
