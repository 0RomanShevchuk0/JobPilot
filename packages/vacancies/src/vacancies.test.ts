import type { NormalizedPosting } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import {
   mergeVacancy,
   normalizeCompanyName,
   normalizeSkills,
   seniorityFromTitle,
   vacancyFingerprint,
   type PostingForMerge,
} from "./index.js";

// titles, companies and skills below are real ones collected from Djinni

describe("seniorityFromTitle", () => {
   it.each([
      ["Senior Backend Engineer (Boosters)", "senior"],
      ["Sr FullStack (Node.js 60%, React 40%)", "senior"],
      ["Strong Middle / Middle+ Backend Developer (Node.js / TypeScript)", "middle"],
      ["Junior NodeJS Backend Developer", "junior"],
      ["Trainee Node.js Developer (AI-Augmented Development)", "intern"],
      ["Backend Team Lead (Node.js)", "lead"],
      ["Lead Backend Engineer", "lead"],
   ])("%s → %s", (title, level) => {
      expect(seniorityFromTitle(title)).toBe(level);
   });

   it.each([
      "Junior-Middle Backend Developer (Node.js, LLM/RAG, MCP, AI agents)", // a range, not one level
      "Head of Engineering (Utilities)", // not a level we track
      "Backend Developer (Node.js)", // no level stated
   ])("%s → undefined", (title) => {
      expect(seniorityFromTitle(title)).toBeUndefined();
   });
});

describe("normalizeCompanyName", () => {
   it.each([
      ["NetEasy LLC", "neteasy"],
      ["WeHireMediaBuyers Ltd.", "wehiremediabuyers"],
      ["PAR Retail (formerly Stuzo)", "par retail"],
      ["Three Whales s.r.o.", "three whales"],
      ["Acme Sp. z o.o.", "acme"],
      ["ТОВ «Ромашка»", "ромашка"],
      ["Kiss My Apps", "kiss my apps"],
   ])("%s → %s", (name, key) => {
      expect(normalizeCompanyName(name)).toBe(key);
   });
});

describe("normalizeSkills", () => {
   it("maps spellings of one technology to one name and drops duplicates", () => {
      expect(
         normalizeSkills([
            "Node.js",
            "NodeJS",
            "Nest.js",
            "PostgreSQL",
            "Postgres",
            "k8s",
            "REST API",
         ]),
      ).toEqual(["node.js", "nestjs", "postgresql", "kubernetes", "rest"]);
   });

   it("keeps unknown skills as written, lowercased", () => {
      expect(normalizeSkills(["ClickHouse", "OAuth 2.0", "soap"])).toEqual([
         "clickhouse",
         "oauth 2.0",
         "soap",
      ]);
   });
});

const posting = (
   id: string,
   parsed: Partial<NormalizedPosting>,
   firstSeenAt: string,
   goneAt: string | null = null,
): PostingForMerge => ({
   postingId: id,
   parsed: {
      source: "djinni",
      externalId: id,
      url: `https://djinni.co/jobs/${id}-x/`,
      title: "Senior Node.js Developer",
      category: "Node.js",
      description: `description of ${id}`,
      company: { name: "Zeely" },
      ...parsed,
   },
   firstSeenAt: new Date(firstSeenAt),
   goneAt: goneAt ? new Date(goneAt) : null,
});

describe("vacancyFingerprint", () => {
   it("matches the same employer and title written differently", () => {
      const a = posting(
         "1",
         { company: { name: "Zeely LLC" }, title: "Senior Node.js Developer" },
         "2026-09-01",
      );
      const b = posting(
         "2",
         { company: { name: "zeely" }, title: "Senior  Node.js developer!" },
         "2026-09-02",
      );
      expect(vacancyFingerprint(a)).toBe(vacancyFingerprint(b));
      expect(vacancyFingerprint(a)).toBe("zeely|senior node js developer");
   });

   it("never matches postings with a hidden employer", () => {
      const a = posting("1", { company: undefined }, "2026-09-01");
      const b = posting("2", { company: undefined }, "2026-09-01");
      expect(vacancyFingerprint(a)).not.toBe(vacancyFingerprint(b));
   });
});

describe("mergeVacancy", () => {
   const older = posting(
      "old",
      { workModes: ["remote"], skills: ["Node.js", "TypeScript"] },
      "2026-09-01",
   );
   const newer = posting(
      "new",
      {
         workModes: ["hybrid"],
         salary: { min: 4000, max: 5000, currency: "USD", period: "month" },
         skills: ["NodeJS", "PostgreSQL"],
      },
      "2026-09-05",
   );

   it("takes each field from the earliest posting that has it, whatever the input order", () => {
      for (const input of [
         [older, newer],
         [newer, older],
      ]) {
         const v = mergeVacancy(input);
         expect(v.description).toBe("description of old");
         expect(v.salary).toEqual({ min: 4000, max: 5000, currency: "USD", period: "month" }); // only the newer does
      }
   });

   it("unites normalized skills of all postings", () => {
      expect(mergeVacancy([older, newer]).skills).toEqual(["node.js", "typescript", "postgresql"]);
   });

   it("unites work modes and locations of open postings", () => {
      const dou = posting(
         "dou",
         { workModes: ["onsite"], locations: [{ kind: "office", raw: "за кордоном" }] },
         "2026-10-07",
      );
      const djinni = posting(
         "djinni",
         { workModes: ["remote"], locations: [{ kind: "candidate", raw: "Worldwide" }] },
         "2026-10-22",
      );
      const v = mergeVacancy([dou, djinni]);
      expect(v.workModes).toEqual(["onsite", "remote"]);
      expect(v.locations).toEqual([
         { kind: "office", raw: "за кордоном" },
         { kind: "candidate", raw: "Worldwide" },
      ]);
   });

   it("leaves out work modes and locations of closed postings while another is open", () => {
      const closedRemote = posting(
         "closed",
         { workModes: ["remote"], locations: [{ kind: "candidate", raw: "Worldwide" }] },
         "2026-10-01",
         "2026-10-10",
      );
      const openOffice = posting(
         "open",
         { workModes: ["onsite"], locations: [{ kind: "office", raw: "Kyiv", city: "Kyiv" }] },
         "2026-10-12",
      );
      const v = mergeVacancy([closedRemote, openOffice]);
      expect(v.workModes).toEqual(["onsite"]);
      expect(v.locations).toEqual([{ kind: "office", raw: "Kyiv", city: "Kyiv" }]);
   });

   it("unites work modes of all postings once every one is closed", () => {
      const a = posting("a", { workModes: ["remote"] }, "2026-10-01", "2026-10-10");
      const b = posting("b", { workModes: ["onsite"] }, "2026-10-02", "2026-10-11");
      expect(mergeVacancy([a, b]).workModes).toEqual(["remote", "onsite"]);
   });

   it("keeps a place listed by two sources once", () => {
      const kyiv = { kind: "office" as const, raw: "Kyiv", city: "Kyiv" };
      const a = posting("a", { locations: [kyiv] }, "2026-10-01");
      const b = posting("b", { locations: [kyiv] }, "2026-10-02");
      expect(mergeVacancy([a, b]).locations).toEqual([kyiv]);
   });

   it("fills seniority from the title when no source states it", () => {
      expect(mergeVacancy([older]).seniority).toBe("senior");
   });

   it("is closed only when every posting is gone, at the time the last one went", () => {
      expect(mergeVacancy([older, newer]).closedAt).toBeNull();
      const bothGone = mergeVacancy([
         { ...older, goneAt: new Date("2026-09-10") },
         { ...newer, goneAt: new Date("2026-09-12") },
      ]);
      expect(bothGone.closedAt).toEqual(new Date("2026-09-12"));
   });
});
