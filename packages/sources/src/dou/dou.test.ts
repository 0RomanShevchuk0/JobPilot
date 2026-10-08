import { readFileSync } from "node:fs";
import {
   CannotApplyError,
   normalizedPostingSchema,
   SessionExpiredError,
   type RawPosting,
} from "@jobpilot/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readJobPage } from "./account-page.js";
import { createDouAdapter } from "./adapter.js";
import { readApplyFormOnPage } from "./apply-form.js";
import { isClosedPage, parseJobPage, parseSalary, publishedAt } from "./job-page.js";
import { parseRss, rssUrl } from "./rss.js";
import { DOU_ID } from "./site.js";

// real pages saved from jobs.dou.ua on 2026-10-06
const fixture = (name: string) =>
   readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

const raw = (externalId: string, url: string, file: string): RawPosting => ({
   externalId,
   url,
   fetchedAt: new Date("2026-10-06T13:00:00Z"),
   contentType: "html",
   body: fixture(file),
});

describe("rss", () => {
   it("builds feed URLs filtered by category", () => {
      expect(rssUrl()).toBe("https://jobs.dou.ua/vacancies/feeds/");
      expect(rssUrl("Node.js")).toBe("https://jobs.dou.ua/vacancies/feeds/?category=Node.js");
      expect(rssUrl("Front End")).toBe("https://jobs.dou.ua/vacancies/feeds/?category=Front+End");
   });

   it("extracts job ids, clean links and bump dates", () => {
      const refs = parseRss(fixture("rss.xml"));
      expect(refs).toHaveLength(3);
      expect(refs[0]).toEqual({
         externalId: "375739",
         url: "https://jobs.dou.ua/companies/sombra/vacancies/375739/",
         updatedAt: new Date("2026-10-06T15:33:04+03:00"),
      });
   });
});

describe("job page: abroad, salary, applying on the employer's site", () => {
   const url = "https://jobs.dou.ua/companies/apextech/vacancies/368779/";
   const posting = parseJobPage(raw("368779", url, "job-salary-external.html"));

   it("satisfies the platform contract", () => {
      expect(normalizedPostingSchema.safeParse(posting).success).toBe(true);
   });

   it("reads the header fields", () => {
      expect(posting).toMatchObject({
         source: DOU_ID,
         externalId: "368779",
         url,
         title: "Fullstack Engineer",
         company: { name: "ApexTech" },
         skills: ["Node.js"], // the category from the breadcrumbs, not the "за кордоном" link after it
         apply: { method: "external", url: "https://dou.ua/goto/vacancy/?id=368779" },
      });
      // "5 жовтня 2026": the date only, as the start of that day in Kyiv (UTC+3 in summer)
      expect(posting.publishedAt).toBe("2026-10-04T21:00:00.000Z");
   });

   it("reads the salary as USD a month, keeping the text", () => {
      expect(posting.salary).toEqual({
         min: 2500,
         max: 3500,
         currency: "USD",
         period: "month",
         raw: "$2500–3500",
      });
   });

   it("treats 'за кордоном' alone as an office job abroad", () => {
      expect(posting.workModes).toEqual(["onsite"]);
      expect(posting.locations).toEqual([{ kind: "office", raw: "за кордоном" }]);
   });

   it("keeps the description structure as markdown", () => {
      expect(posting.description).toContain("**Responsibilities:**");
      expect(posting.description).toMatch(/^• Mentor \/ Coach other team members$/m);
      expect(posting.description).not.toContain("<");
      expect(posting.description).not.toMatch(/\n{3,}|[ \t]+\n|\u00a0/); // no editor leftovers
   });
});

describe("job page: offices or remote", () => {
   const posting = parseJobPage(
      raw(
         "375233",
         "https://jobs.dou.ua/companies/honeycomb-software/vacancies/375233/",
         "job-cities.html",
      ),
   );

   it("lists the cities as written, without guessing city or country fields", () => {
      expect(posting.locations).toEqual([
         { kind: "office", raw: "Львів" },
         { kind: "office", raw: "Рівне" },
         { kind: "office", raw: "Вроцлав (Польща)" },
      ]);
      expect(posting.workModes).toEqual(["onsite", "remote"]);
      expect(posting.salary).toBeUndefined();
   });
});

describe("job page: a badge next to the date", () => {
   // saved from jobs.dou.ua on 2026-10-07: "6 жовтня 2026" followed by a "бронювання" badge link
   const posting = parseJobPage(
      raw("375738", "https://jobs.dou.ua/companies/okko-group/vacancies/375738/", "job-badge.html"),
   );

   it("reads the date without the badge", () => {
      expect(posting.publishedAt).toBe("2026-10-05T21:00:00.000Z");
   });
});

describe("job page: remote, applying on DOU", () => {
   const url = "https://jobs.dou.ua/companies/sombra/vacancies/375739/";
   const posting = parseJobPage(raw("375739", url, "job-remote.html"));

   it("satisfies the platform contract", () => {
      expect(normalizedPostingSchema.safeParse(posting).success).toBe(true);
   });

   it("is remote with no office", () => {
      expect(posting.workModes).toEqual(["remote"]);
      expect(posting.locations).toBeUndefined();
   });

   it("is applied to on DOU itself", () => {
      expect(posting.company).toEqual({ name: "Sombra" });
      expect(posting.apply).toEqual({ method: "on_site", url });
   });
});

describe("closed job page", () => {
   const html = fixture("job-closed.html");

   it("is recognized as closed", () => {
      expect(isClosedPage(html)).toBe(true);
      expect(isClosedPage(fixture("job-remote.html"))).toBe(false);
   });

   it("is not parsed into a posting", () => {
      expect(() =>
         parseJobPage(
            raw(
               "276604",
               "https://jobs.dou.ua/companies/zetico/vacancies/276604/",
               "job-closed.html",
            ),
         ),
      ).toThrow(/layout not recognized/);
   });
});

// pages loaded with a session, saved on 2026-10-08; the account's name, contacts and ids replaced
describe("job page under the account", () => {
   it("lets the user apply through DOU's form", () => {
      expect(readJobPage(fixture("account-can-apply.html"))).toEqual({
         status: "ok",
         check: { applyCheck: { canApply: true } },
      });
   });

   it("lets the user apply on the employer's site", () => {
      expect(readJobPage(fixture("account-external.html"))).toEqual({
         status: "ok",
         check: { applyCheck: { canApply: true } },
      });
   });

   it("says the user applied already", () => {
      expect(readJobPage(fixture("account-applied.html"))).toEqual({
         status: "ok",
         check: { applyCheck: { canApply: false, reason: "Already applied to this job on DOU" } },
      });
   });

   it("finds a closed job gone", () => {
      expect(readJobPage(fixture("account-closed.html"))).toEqual({ status: "gone" });
   });

   it("throws SessionExpiredError on a page DOU shows to anonymous visitors", () => {
      expect(() => readJobPage(fixture("job-remote.html"))).toThrow(SessionExpiredError);
   });
});

describe("application form", () => {
   it("reads the message and the CV fields, nothing to answer", () => {
      const { html, ...form } = readApplyFormOnPage(fixture("account-can-apply.html"));
      expect(form).toEqual({
         questions: [],
         message: {
            name: "descr",
            label: "Напишіть трохи про себе і про те, чому вакансія вам підходить",
            kind: "textarea",
            required: false,
            options: undefined,
         },
         cv: {
            name: "user_cv",
            label: "Прикріпіть резюме",
            kind: "file",
            required: false,
            options: undefined,
         },
         other: [],
      });
      expect(html).toMatch(/^<form id="replied-id"/);
   });

   it("has no form for a job applied to on the employer's site", () => {
      expect(() => readApplyFormOnPage(fixture("account-external.html"))).toThrow(
         new CannotApplyError(
            "This job is applied to on the employer's site: https://dou.ua/goto/vacancy/?id=375249",
         ),
      );
   });

   it("has no form for a job applied to already or closed", () => {
      expect(() => readApplyFormOnPage(fixture("account-applied.html"))).toThrow(
         "Already applied to this job on DOU",
      );
      expect(() => readApplyFormOnPage(fixture("account-closed.html"))).toThrow(
         "The job is no longer active on DOU",
      );
   });

   it("throws SessionExpiredError without a session", () => {
      expect(() => readApplyFormOnPage(fixture("job-remote.html"))).toThrow(SessionExpiredError);
   });
});

describe("parseSalary", () => {
   it.each([
      ["$2500–3500", { min: 2500, max: 3500 }],
      ["від\u00a0$1200", { min: 1200 }],
      ["до\u00a0$3000", { max: 3000 }],
      ["$1200", { min: 1200, max: 1200 }],
   ])("%s", (text, range) => {
      expect(parseSalary(text)).toEqual({
         ...range,
         currency: "USD",
         period: "month",
         raw: text.replace("\u00a0", " "),
      });
   });

   it("leaves other currencies and formats out", () => {
      expect(parseSalary("")).toBeUndefined();
      expect(parseSalary("€2000–3000")).toBeUndefined();
      expect(parseSalary("за домовленістю")).toBeUndefined();
   });
});

describe("publishedAt", () => {
   it("takes the start of the day in Kyiv, summer and winter time", () => {
      expect(publishedAt("5 жовтня 2026")).toBe("2026-10-04T21:00:00.000Z"); // UTC+3
      expect(publishedAt("\n 21 листопада 2024\n ")).toBe("2024-11-20T22:00:00.000Z"); // UTC+2
   });

   it("leaves an unknown date out", () => {
      expect(publishedAt("")).toBeUndefined();
      expect(publishedAt("5 October 2026")).toBeUndefined();
   });
});

describe("adapter.fetch", () => {
   const ref = { externalId: "1", url: "https://jobs.dou.ua/companies/x/vacancies/1/" };

   afterEach(() => vi.unstubAllGlobals());

   const respond = (status: number, body = "") =>
      vi.stubGlobal(
         "fetch",
         vi.fn(async () => ({ status, url: ref.url, text: async () => body })),
      );

   it("reports 404 and closed pages as gone", async () => {
      respond(404);
      expect(await createDouAdapter().fetch(ref)).toEqual({ status: "gone" });
      respond(200, fixture("job-closed.html"));
      expect(await createDouAdapter().fetch(ref)).toEqual({ status: "gone" });
   });

   it("throws on unexpected statuses so the queue can retry", async () => {
      respond(503);
      await expect(createDouAdapter().fetch(ref)).rejects.toThrow(/HTTP 503/);
   });

   it("returns the page body for a live job", async () => {
      respond(200, fixture("job-remote.html"));
      const result = await createDouAdapter().fetch(ref);
      expect(result.status).toBe("ok");
      expect(result.status === "ok" && result.raw.contentType).toBe("html");
   });
});
