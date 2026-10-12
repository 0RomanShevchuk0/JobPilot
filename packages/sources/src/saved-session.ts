import { SessionExpiredError, type SiteSession } from "@jobpilot/contracts";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright";

/** Where Google Chrome lives; logins run in the real Chrome, see loginInChrome. */
const CHROME_PATHS = [
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
   "/usr/bin/google-chrome",
   "/usr/bin/google-chrome-stable",
   // Windows: installed for all users (64- or 32-bit), or for the current user only
   ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA]
      .filter((dir) => dir !== undefined)
      .map((dir) => join(dir, "Google", "Chrome", "Application", "chrome.exe")),
];

/** A job site to log in to. */
export interface LoginSite {
   /** the site's name to show, e.g. "Djinni" */
   name: string;
   /** the page the user logs in on */
   loginUrl: string;
   /** the cookies of this domain and its subdomains are the session, e.g. "djinni.co" */
   domain: string;
}

/**
 * Logs in to a job site in the user's real Google Chrome and saves the session for headless runs.
 *
 * Google refuses sign-in in a browser driven by automation, and job sites offer Google sign-in (some
 * accounts have nothing else), so the login can't happen in a Playwright browser. Instead:
 * 1. Chrome opens with a fresh temporary profile (not the user's own) on the site's login page;
 * 2. the user logs in there in any way the site offers and quits that Chrome;
 * 3. Playwright reads the profile and keeps only the site's cookies: the Google session is not saved;
 * 4. the temporary profile is deleted.
 * No password ever reaches JobPilot. Whether the login worked is for the caller to check.
 */
export async function loginInChrome(site: LoginSite, sessionPath: string): Promise<void> {
   const chrome = CHROME_PATHS.find((path) => existsSync(path));
   if (!chrome)
      throw new Error(`Google Chrome is not installed: the ${site.name} login runs in it`);
   const profile = await mkdtemp(join(tmpdir(), "jobpilot-login-"));
   try {
      await runUntilQuit(chrome, [
         `--user-data-dir=${profile}`,
         "--no-first-run",
         "--no-default-browser-check",
         site.loginUrl,
      ]);
      await saveSiteCookies(profile, site.domain, sessionPath);
   } finally {
      await rm(profile, { recursive: true, force: true });
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

/** Copies one site's cookies of a Chrome profile into a Playwright session file. */
async function saveSiteCookies(
   profile: string,
   domain: string,
   sessionPath: string,
): Promise<void> {
   const context = await chromium.launchPersistentContext(profile, {
      channel: "chrome", // the same Chrome that wrote the profile, so it can read its cookies
      headless: true,
      // Playwright's default fake keychain can't decrypt cookies Chrome encrypted with the real one
      ignoreDefaultArgs: ["--use-mock-keychain"],
   });
   try {
      const state = await context.storageState();
      const isSite = (host: string) => host === domain || host.endsWith(`.${domain}`);
      const siteOnly: SiteSession = {
         cookies: state.cookies.filter((c) => isSite(c.domain.replace(/^\./, ""))), // ".djinni.co" → "djinni.co"
         origins: state.origins.filter((o) => isSite(new URL(o.origin).hostname)),
      };
      await mkdir(dirname(sessionPath), { recursive: true });
      await writeFile(sessionPath, JSON.stringify(siteOnly, null, 2), { mode: 0o600 }); // readable by the owner only
   } finally {
      await context.close();
   }
}

/** The session loginInChrome saved to sessionPath; SessionExpiredError when there is none yet. */
export async function readSessionFile(sessionPath: string, siteName: string): Promise<SiteSession> {
   let file: string;
   try {
      file = await readFile(sessionPath, "utf8");
   } catch {
      throw new SessionExpiredError(siteName); // no session file yet
   }
   return JSON.parse(file) as SiteSession;
}

/**
 * The session as a Cookie header, for plain HTTP requests without a browser. Expired cookies are left
 * out; whether the site still accepts the rest only a request tells.
 */
export function sessionCookieHeader(session: SiteSession): string {
   const nowSeconds = Date.now() / 1000;
   const live = session.cookies.filter((c) => c.expires === -1 || c.expires > nowSeconds);
   return live.map((c) => `${c.name}=${c.value}`).join("; ");
}

/** A browser context with the session, introducing itself as an ordinary desktop Chrome. */
export function openSessionContext(
   browser: Browser,
   session: SiteSession,
): Promise<BrowserContext> {
   return browser.newContext({ storageState: session, userAgent: desktopUserAgent(browser) });
}

/**
 * The User-Agent of a regular desktop Chrome of the same version. Headless Chromium sends
 * "HeadlessChrome/…" by default: the first thing bot checks look at.
 */
function desktopUserAgent(browser: Browser): string {
   const major = browser.version().split(".")[0]; // "153.0.8010.12" → "153"
   const os =
      process.platform === "darwin"
         ? "Macintosh; Intel Mac OS X 10_15_7"
         : process.platform === "win32"
           ? "Windows NT 10.0; Win64; x64"
           : "X11; Linux x86_64";
   // Chrome itself reports only the major version, the rest as zeros
   return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}
