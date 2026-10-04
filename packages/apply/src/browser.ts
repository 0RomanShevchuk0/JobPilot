import { chromium, type Browser } from "playwright";

export interface LaunchOptions {
   /** a window on screen, for the user to watch and take over; headless otherwise */
   visible?: boolean;
   /** a pause before every action, in ms, so a person can follow along */
   slowMo?: number;
}

/**
 * The agent's Chromium. Playwright sets navigator.webdriver = true, which any script on a page can read
 * and report; this flag turns that off, as in a regular Chrome.
 */
export function launchBrowser({ visible = false, slowMo }: LaunchOptions = {}): Promise<Browser> {
   return chromium.launch({
      headless: !visible,
      slowMo,
      args: ["--disable-blink-features=AutomationControlled"],
   });
}
