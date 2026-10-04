import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export const DJINNI_URL = "https://djinni.co";

/** The session file is missing or Djinni no longer accepts it: log in again. */
export class DjinniSessionExpiredError extends Error {
   constructor() {
      super("Not logged in to Djinni: run the login command again");
   }
}

/** Where Google Chrome lives; the login runs in the real Chrome, see loginToDjinni. */
const CHROME_PATHS = [
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
   "/usr/bin/google-chrome",
   "/usr/bin/google-chrome-stable",
];

/**
 * Logs in to Djinni in the user's real Google Chrome and saves the session for headless runs.
 *
 * Google refuses sign-in in a browser driven by automation, and Djinni accounts may only have Google
 * sign-in, so the login can't happen in a Playwright browser. Instead:
 * 1. Chrome opens with a fresh temporary profile (not the user's own) on the Djinni login page;
 * 2. the user logs in there in any way Djinni offers and quits that Chrome;
 * 3. Playwright reads the profile and keeps only djinni.co cookies: the Google session is not saved;
 * 4. the temporary profile is deleted.
 * No password ever reaches JobPilot.
 */
export async function loginToDjinni(sessionPath: string): Promise<void> {
   const chrome = CHROME_PATHS.find((path) => existsSync(path));
   if (!chrome) throw new Error("Google Chrome is not installed: the Djinni login runs in it");
   const profile = await mkdtemp(join(tmpdir(), "jobpilot-djinni-login-"));
   try {
      await runUntilQuit(chrome, [
         `--user-data-dir=${profile}`,
         "--no-first-run",
         "--no-default-browser-check",
         `${DJINNI_URL}/login`,
      ]);
      await saveDjinniCookies(profile, sessionPath);
   } finally {
      await rm(profile, { recursive: true, force: true });
   }

   const browser = await chromium.launch();
   try {
      const page = await (await openDjinniContext(browser, sessionPath)).newPage();
      if (!(await isLoggedIn(page))) throw new DjinniSessionExpiredError();
   } finally {
      await browser.close();
   }
}

/** Starts a program and resolves when the user quits it. */
function runUntilQuit(program: string, args: string[]): Promise<void> {
   return new Promise((resolve, reject) => {
      const child = spawn(program, args, { stdio: "ignore" });
      child.on("error", reject);
      child.on("exit", () => resolve());
   });
}

/** Copies the djinni.co cookies of a Chrome profile into a Playwright session file. */
async function saveDjinniCookies(profile: string, sessionPath: string): Promise<void> {
   const context = await chromium.launchPersistentContext(profile, {
      channel: "chrome", // the same Chrome that wrote the profile, so it can read its cookies
      headless: true,
      // Playwright's default fake keychain can't decrypt cookies Chrome encrypted with the real one
      ignoreDefaultArgs: ["--use-mock-keychain"],
   });
   try {
      const state = await context.storageState();
      const isDjinni = (domain: string) => domain === "djinni.co" || domain.endsWith(".djinni.co");
      const djinniOnly = {
         cookies: state.cookies.filter((c) => isDjinni(c.domain.replace(/^\./, ""))), // ".djinni.co" → "djinni.co"
         origins: state.origins.filter((o) => isDjinni(new URL(o.origin).hostname)),
      };
      await mkdir(dirname(sessionPath), { recursive: true });
      await writeFile(sessionPath, JSON.stringify(djinniOnly, null, 2), { mode: 0o600 }); // readable by the owner only
   } finally {
      await context.close();
   }
}

/** A browser context with the saved Djinni session. */
export async function openDjinniContext(
   browser: Browser,
   sessionPath: string,
): Promise<BrowserContext> {
   try {
      return await browser.newContext({ storageState: sessionPath });
   } catch {
      throw new DjinniSessionExpiredError(); // no session file yet
   }
}

/** Djinni shows "Log In" links to anonymous visitors only. */
export async function isLoggedIn(page: Page): Promise<boolean> {
   await page.goto(`${DJINNI_URL}/jobs/`);
   return (await page.locator("a.sign-in-link").count()) === 0;
}
