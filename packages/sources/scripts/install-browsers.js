// Downloads the browsers the agent drives: Chromium for the visible form-filling window and its
// headless shell for everything else. Run on postinstall, so a fresh checkout works without a separate
// `playwright install`. PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD (the variable Playwright's own install reads)
// skips it: the worker's image sets it, the server worker gets no jobs that open a browser.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD) {
   console.log("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD is set: not downloading the browsers");
   process.exit(0);
}

// the CLI isn't in the package's exports: it lies next to its package.json
const playwrightPackage = createRequire(import.meta.url).resolve("playwright/package.json");
const cli = join(dirname(playwrightPackage), "cli.js");
// through node itself, not the `playwright` bin: on Windows that one is a .cmd shim
const { status } = spawnSync(process.execPath, [cli, "install", "chromium"], { stdio: "inherit" });
process.exit(status ?? 1);
