import { readFileSync } from "node:fs";
import { normalizedPostingSchema, type RawPosting } from "@jobpilot/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDjinniAdapter } from "./adapter.js";
import { isClosedPage, kyivTimeToIso, parseJobPage } from "./job-page.js";
import { parseRss, rssUrl } from "./rss.js";

// real pages saved from djinni.co on 2026-09-26
const fixture = (name: string) =>
   readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

const raw = (externalId: string, url: string, file: string): RawPosting => ({
   externalId,
   url,
   fetchedAt: new Date("2026-09-26T09:00:00Z"),
   contentType: "html",
   body: fixture(file),
});

describe("rss", () => {
   it("builds filtered feed URLs", () => {
      expect(rssUrl()).toBe("https://djinni.co/jobs/rss/");
      expect(rssUrl("Node.js")).toBe("https://djinni.co/jobs/rss/?primary_keyword=Node.js");
   });

   it("extracts job ids, links and bump dates", () => {
      const refs = parseRss(fixture("rss.xml"));
      expect(refs).toHaveLength(3);
      expect(refs[0]).toEqual({
         externalId: "846773",
         url: "https://djinni.co/jobs/846773-ppc-specialist/",
         updatedAt: new Date("2026-09-26T11:40:13+03:00"),
      });
   });
});

describe("job page: remote job without salary", () => {
   const posting = parseJobPage(
      raw("846773", "https://djinni.co/jobs/846773-ppc-specialist/", "job-remote.html"),
   );

   it("satisfies the platform contract", () => {
      expect(normalizedPostingSchema.safeParse(posting).success).toBe(true);
   });

   it("takes structured fields from JSON-LD", () => {
      expect(posting).toMatchObject({
         source: "djinni",
         externalId: "846773",
         title: "PPC Specialist",
         company: { name: "Feenko", website: "https://feenko.com/" },
         publishedAt: "2026-09-26T08:40:13.194Z",
         employmentTypes: ["full_time"],
         experienceYears: 2,
         apply: { method: "on_site", url: "https://djinni.co/jobs/846773-ppc-specialist/" },
      });
      expect(posting.salary).toBeUndefined();
      expect(posting.seniority).toBeUndefined(); // Djinni does not state it; we never guess
   });

   it("takes work mode, languages and candidate region", () => {
      expect(posting.workModes).toEqual(["remote"]);
      expect(posting.languages).toEqual([
         { code: "en", level: "B2" },
         { code: "uk", level: "Native" },
      ]);
      expect(posting.locations).toEqual([{ kind: "candidate", raw: "Europe" }]);
   });

   it("falls back to the category when the job lists no skills", () => {
      expect(posting.skills).toEqual(["PPC"]);
   });

   it("keeps the description structure as markdown", () => {
      expect(posting.description.startsWith("**Feenko** - мобільний продукт")).toBe(true);
      expect(posting.description).toContain("**Чим будеш займатися:**");
      expect(posting.description).toMatch(/^- Керуватимеш Google Ads/m);
      expect(posting.description).not.toContain("<");
      expect(posting.description).not.toMatch(/\n{3,}|[ \t]+\n| /); // no editor leftovers
   });
});

describe("job page: office job with salary and skills", () => {
   const posting = parseJobPage(
      raw(
         "850382",
         "https://djinni.co/jobs/850382-ai-first-senior-software-engineer/",
         "job-office-salary.html",
      ),
   );

   it("satisfies the platform contract", () => {
      expect(normalizedPostingSchema.safeParse(posting).success).toBe(true);
   });

   it("reads salary, office and experience", () => {
      expect(posting.salary).toEqual({ min: 5000, max: 6500, currency: "USD", period: "month" });
      expect(posting.workModes).toEqual(["onsite"]);
      expect(posting.experienceYears).toBe(4);
      expect(posting.company).toEqual({ name: "Orbox", website: "https://www.orbox.ai" });
      expect(posting.publishedAt).toBe("2026-09-26T07:10:20.456Z");
   });

   it("separates the office location from where candidates may live", () => {
      expect(posting.locations).toEqual([
         { kind: "office", raw: "Kyiv, Ukraine", city: "Kyiv", country: "UA" },
         { kind: "candidate", raw: "UA", country: "UA" },
      ]);
   });

   it("reads all listed skills, including the collapsed ones, plus the category", () => {
      expect(posting.skills).toEqual([
         "TypeScript",
         "React.js",
         "Node.js",
         "PostgreSQL",
         "Docker",
         "AI Coding",
         "ML AI",
      ]);
      expect(posting.languages).toEqual([{ code: "en", level: "C1" }]);
   });
});

describe("job page: location only on the page, not in JSON-LD", () => {
   it("reads 'Worldwide' from the page as the candidate location", () => {
      const posting = parseJobPage(
         raw(
            "850281",
            "https://djinni.co/jobs/850281-senior-backend-developer/",
            "job-worldwide.html",
         ),
      );
      expect(posting.locations).toEqual([{ kind: "candidate", raw: "Worldwide" }]);
      expect(posting.workModes).toEqual(["remote"]);
   });
});

describe("closed job page", () => {
   const html = fixture("job-closed.html");

   it("is recognized as closed", () => {
      expect(isClosedPage(html)).toBe(true);
      expect(isClosedPage(fixture("job-remote.html"))).toBe(false);
   });

   it("is not parsed into a half-empty posting", () => {
      expect(() =>
         parseJobPage(
            raw("700000", "https://djinni.co/jobs/700000-frontend-developer/", "job-closed.html"),
         ),
      ).toThrow(/layout not recognized/);
   });
});

describe("kyivTimeToIso", () => {
   it("applies the Kyiv offset for summer and winter time", () => {
      expect(kyivTimeToIso("2026-07-01T12:00:00")).toBe("2026-07-01T09:00:00.000Z"); // UTC+3
      expect(kyivTimeToIso("2026-01-15T12:00:00")).toBe("2026-01-15T10:00:00.000Z"); // UTC+2
   });
});

describe("adapter.fetch", () => {
   const ref = { externalId: "1", url: "https://djinni.co/jobs/1-x/" };

   afterEach(() => vi.unstubAllGlobals());

   const respond = (status: number, body = "") =>
      vi.stubGlobal(
         "fetch",
         vi.fn(async () => ({ status, url: ref.url, text: async () => body })),
      );

   it("reports 404 and closed pages as gone", async () => {
      respond(404);
      expect(await createDjinniAdapter().fetch(ref)).toEqual({ status: "gone" });
      respond(200, fixture("job-closed.html"));
      expect(await createDjinniAdapter().fetch(ref)).toEqual({ status: "gone" });
   });

   it("throws on unexpected statuses so the queue can retry", async () => {
      respond(503);
      await expect(createDjinniAdapter().fetch(ref)).rejects.toThrow(/HTTP 503/);
   });

   it("returns the page body for a live job", async () => {
      respond(200, fixture("job-remote.html"));
      const result = await createDjinniAdapter().fetch(ref);
      expect(result.status).toBe("ok");
      expect(result.status === "ok" && result.raw.contentType).toBe("html");
   });
});
