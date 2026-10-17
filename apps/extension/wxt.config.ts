import { defineConfig } from "wxt";

export default defineConfig({
   // no auto-imports: imported by hand from their own modules (wxt/browser…), like everything else
   imports: false,
   // with the other packages' builds: gitignored, prettier skips it, turbo caches it.
   // `pnpm dev` writes dist/chrome-mv3-dev: load that folder in chrome://extensions
   outDir: "dist",
   manifest: {
      name: "JobPilot",
      // the job sites' cookies, httpOnly ones too: the user's session there
      permissions: ["cookies"],
      host_permissions: ["https://djinni.co/*", "https://dou.ua/*"],
   },
});
