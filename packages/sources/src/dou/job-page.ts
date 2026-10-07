import {
   SourceIds,
   type NormalizedPosting,
   type RawPosting,
   type Salary,
   type WorkMode,
} from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { kyivTimeToIso } from "../kyiv-time.js";

// DOU has no JobPosting JSON-LD: everything comes from the markup. Pages are always in Ukrainian,
// whatever the request's language, so markers are classes, not wording.

// a closed job still answers 200; its block gets this class and the title "(вакансія неактивна)"
const CLOSED_JOB = ".l-vacancy.__inactive";
const TITLE = ".l-vacancy h1";
const DESCRIPTION = ".l-vacancy .vacancy-section";
// "5 жовтня 2026": the day the job was published or last bumped, without time
const DATE = ".l-vacancy .date";
// the company is in the header above the job, its first link is the name
const COMPANY = ".b-compinfo .l-n a";
// "Львів, Рівне, Вроцлав (Польща), віддалено"
const PLACES = ".l-vacancy .sh-info .place";
// "$2500–3500", "від $1200", "до $3000"
const SALARY = ".l-vacancy .sh-info .salary";
// "Всі вакансії / Node.js / Львів": the category link has ?category= and nothing else
const BREADCRUMB_LINKS = "li.breadcrumbs a";
// applying goes through DOU's redirect to the employer's site or ATS
const EXTERNAL_APPLY = ".reply a.replied-external";
// applying on DOU; without a session the link only offers to sign in
const ON_SITE_APPLY = ".reply #relogin-link";

// in the list of places: the job is remote; anything else is a city or "за кордоном" (relocation abroad)
const REMOTE = "віддалено";

/** Closed jobs still answer 200, marked by a class on the job block. */
export function isClosedPage(html: string): boolean {
   return cheerio.load(html)(CLOSED_JOB).length > 0;
}

export function parseJobPage(raw: RawPosting): NormalizedPosting {
   const $ = cheerio.load(raw.body);
   const title = $(TITLE).first().text().trim();
   const descriptionHtml = $(DESCRIPTION).first().html();
   if ($(CLOSED_JOB).length > 0 || !title || !descriptionHtml) {
      // a layout change or a closed job: fail loudly instead of saving half a posting
      throw new Error(`dou ${raw.externalId}: job page layout not recognized`);
   }
   const places = placesOnPage($);
   const company = $(COMPANY).first().text().trim();
   const category = categoryOnPage($);
   // the block's own text: badges like "бронювання" or "deftech" are links inside it
   const date = $(DATE)
      .first()
      .contents()
      .filter((_, node) => node.type === "text")
      .text();

   return {
      source: SourceIds.dou,
      externalId: raw.externalId,
      url: raw.url,
      title,
      description: toMarkdown(descriptionHtml),
      company: company ? { name: company } : undefined,
      publishedAt: publishedAt(date),
      workModes: nonEmpty(workModes(places)),
      // DOU has no "where candidates may work from": every place is the job's own
      locations: nonEmpty(
         places.filter((p) => p !== REMOTE).map((p) => ({ kind: "office" as const, raw: p })),
      ),
      salary: parseSalary($(SALARY).first().text()),
      skills: category ? [category] : undefined,
      apply: apply($, raw.url),
   };
}

function placesOnPage($: cheerio.CheerioAPI): string[] {
   return $(PLACES)
      .first()
      .text()
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
}

// genitive month names, as in "5 жовтня 2026"
const MONTHS = [
   "січня",
   "лютого",
   "березня",
   "квітня",
   "травня",
   "червня",
   "липня",
   "серпня",
   "вересня",
   "жовтня",
   "листопада",
   "грудня",
];

// "5 жовтня 2026" → day, month name, year
const DATE_TEXT = /^(\d{1,2}) (\S+) (\d{4})$/;

/** The page has the date only: it becomes the start of that day in Kyiv. */
export function publishedAt(text: string): string | undefined {
   const m = DATE_TEXT.exec(text.replace(/\s+/g, " ").trim()); // line breaks and runs of spaces → one space
   if (!m) return undefined;
   const [, day, monthName, year] = m;
   const month = MONTHS.indexOf(monthName) + 1;
   if (month === 0) return undefined;
   const pad = (n: number | string) => String(n).padStart(2, "0");
   return kyivTimeToIso(`${year}-${pad(month)}-${pad(day)}T00:00:00`);
}

/**
 * No hybrid on DOU: a remote job lists "віддалено", an office or hybrid one lists only cities, and
 * "Київ, віддалено" is either, like Djinni's "Office or Remote".
 */
function workModes(places: string[]): WorkMode[] {
   const modes: WorkMode[] = [];
   if (places.some((p) => p !== REMOTE)) modes.push("onsite");
   if (places.includes(REMOTE)) modes.push("remote");
   return modes;
}

// "$2500–3500" → from, 2500, 3500; "від $1200" → "від", 1200; "до $3000" → "до", 3000
const SALARY_TEXT = /^(?:(від|до) )?\$(\d+)(?:[–-](\d+))?$/;

/**
 * DOU states salaries in US dollars a month: the page never says so, it is the site's convention.
 * Another currency or format is left out rather than guessed.
 */
export function parseSalary(text: string): Salary | undefined {
   const raw = text.replace(/\s+/g, " ").trim(); // &nbsp; and line breaks → one space
   const m = SALARY_TEXT.exec(raw);
   if (!m) return undefined;
   const [, bound, first, second] = m;
   const amount = Number(first);
   if (second) return { min: amount, max: Number(second), currency: "USD", period: "month", raw };
   if (bound === "до") return { max: amount, currency: "USD", period: "month", raw };
   if (bound === "від") return { min: amount, currency: "USD", period: "month", raw };
   // a bare "$1200": the exact amount
   return { min: amount, max: amount, currency: "USD", period: "month", raw };
}

function categoryOnPage($: cheerio.CheerioAPI): string | undefined {
   const link = $(BREADCRUMB_LINKS)
      .toArray()
      .map((el) => $(el).attr("href") ?? "")
      .filter((href) => URL.canParse(href))
      .map((href) => new URL(href).searchParams)
      .find((params) => params.size === 1 && params.has("category"));
   return link?.get("category") || undefined;
}

function apply($: cheerio.CheerioAPI, url: string): NormalizedPosting["apply"] {
   const external = $(EXTERNAL_APPLY).attr("href");
   if (external && URL.canParse(external)) return { method: "external", url: external };
   if ($(ON_SITE_APPLY).length > 0) return { method: "on_site", url };
   return undefined;
}

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function toMarkdown(html: string): string {
   return turndown
      .turndown(html)
      .replace(/\u00a0/g, " ") // &nbsp; that editors leave between words
      .replace(/^(\s*)([-*]|\d+\.) {2,}/gm, "$1$2 ") // turndown pads list markers: "-   item"
      .replace(/[ \t]+$/gm, "") // spaces and tabs at the end of every line
      .replace(/\n{3,}/g, "\n\n") // 3+ line breaks in a row → one empty line between blocks
      .trim();
}

function nonEmpty<T>(items: T[]): T[] | undefined {
   return items.length > 0 ? items : undefined;
}
