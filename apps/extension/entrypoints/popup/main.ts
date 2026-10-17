import { browser } from "wxt/browser";

// the job sites whose session the extension reads
const DOMAINS = ["djinni.co", "dou.ua"];

/** For now only shows which cookies the extension sees on each site: the session is among them. */
async function listCookies(): Promise<string> {
   const lines = [];
   for (const domain of DOMAINS) {
      const cookies = await browser.cookies.getAll({ domain });
      lines.push(`${domain}: ${cookies.length} cookies`);
      for (const c of cookies) lines.push(`  ${c.name}${c.httpOnly ? " (httpOnly)" : ""}`);
   }
   return lines.join("\n");
}

document.getElementById("out")!.textContent = await listCookies();
