import { profileSchema, type Profile } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import { prefilter, type VacancyForPrefilter } from "./prefilter.js";
import { toUsdPerMonth } from "./salary.js";

const profile: Profile = profileSchema.parse({
   seniority: "senior",
   salary: { min: 4000, currency: "USD", period: "month" },
   locations: [
      { kind: "candidate", raw: "Ukraine", country: "UA" },
      { kind: "office", raw: "Kyiv", city: "Kyiv", country: "UA" },
   ],
   workModes: ["remote", "hybrid"],
   languages: [
      { code: "en", level: "B2" },
      { code: "uk", level: "Native" },
   ],
   hardFilters: {
      seniorities: ["middle", "senior"],
      excludeCompanies: ["EPAM Systems"],
      stopWords: ["PHP", "Blockchain"],
   },
});

// a vacancy where nothing is known: must always pass
const unknown: VacancyForPrefilter = {
   title: "Backend Developer",
   workModes: [],
   locations: [],
   languages: [],
};

const checksOf = (v: Partial<VacancyForPrefilter>) =>
   prefilter(profile, { ...unknown, ...v }).rejectedBy.map((r) => r.check);

describe("prefilter", () => {
   it("passes a vacancy it knows nothing about", () => {
      expect(prefilter(profile, unknown)).toEqual({ passed: true, rejectedBy: [] });
   });

   it("passes a vacancy that fits everything", () => {
      const result = prefilter(profile, {
         title: "Senior Node.js Developer",
         seniority: "senior",
         workModes: ["remote"],
         locations: [{ kind: "candidate", raw: "Europe" }],
         languages: [{ code: "en", level: "B2" }],
         salary: { min: 4500, max: 6000, currency: "USD", period: "month" },
         companyNormalizedName: "zeely",
      });
      expect(result.passed).toBe(true);
   });

   it("seniority: rejects a level outside the wanted ones", () => {
      expect(checksOf({ seniority: "junior" })).toEqual(["seniority"]);
      expect(checksOf({ seniority: "middle" })).toEqual([]);
   });

   it("work mode: rejects when no mode fits", () => {
      expect(checksOf({ workModes: ["onsite"] })).toEqual(["work_mode"]);
      expect(checksOf({ workModes: ["onsite", "remote"] })).toEqual([]);
   });

   it("office city: an office job elsewhere is rejected, in my city it is not", () => {
      const office = (city: string): Partial<VacancyForPrefilter> => ({
         workModes: ["hybrid"],
         locations: [{ kind: "office", raw: city, city }],
      });
      expect(checksOf(office("Lviv"))).toEqual(["office_city"]);
      expect(checksOf(office("Kyiv"))).toEqual([]);
   });

   it("candidate country: rejects other countries, passes regions like Worldwide", () => {
      const from = (raw: string, country?: string): Partial<VacancyForPrefilter> => ({
         locations: [{ kind: "candidate", raw, country }],
      });
      expect(checksOf(from("US", "US"))).toEqual(["candidate_country"]);
      expect(checksOf(from("UA", "UA"))).toEqual([]);
      expect(checksOf(from("Worldwide"))).toEqual([]);
   });

   it("salary: compares the top of the range with my minimum across currencies and periods", () => {
      expect(
         checksOf({ salary: { min: 2000, max: 3500, currency: "USD", period: "month" } }),
      ).toEqual(["salary"]);
      // 60k EUR a year ≈ 5400 USD a month
      expect(checksOf({ salary: { max: 60000, currency: "EUR", period: "year" } })).toEqual([]);
      // a currency without a rate is unknown, not a rejection
      expect(checksOf({ salary: { max: 1, currency: "XYZ", period: "month" } })).toEqual([]);
   });

   it("language: rejects a higher required level of a language I listed", () => {
      expect(checksOf({ languages: [{ code: "en", level: "C1" }] })).toEqual(["language"]);
      expect(checksOf({ languages: [{ code: "uk", level: "C2" }] })).toEqual([]); // native ≥ C2
      // a language missing from my profile may just not be filled in
      expect(checksOf({ languages: [{ code: "pl", level: "B2" }] })).toEqual([]);
   });

   it("stop words: match whole words in the title", () => {
      expect(checksOf({ title: "Middle Node.js Developer (Blockchain)" })).toEqual(["stop_word"]);
      expect(checksOf({ title: "PHP Developer" })).toEqual(["stop_word"]);
      expect(checksOf({ title: "Graphics Engineer" })).toEqual([]); // contains "php" letters, not the word
   });

   it("company: excluded employers are rejected however they are written", () => {
      expect(checksOf({ companyNormalizedName: "epam systems" })).toEqual(["company"]);
      expect(checksOf({ companyNormalizedName: undefined })).toEqual([]); // hidden employer
   });

   it("reports every failed check, not only the first", () => {
      expect(
         checksOf({ seniority: "junior", workModes: ["onsite"], title: "PHP Developer" }),
      ).toEqual(["seniority", "work_mode", "stop_word"]);
   });
});

describe("toUsdPerMonth", () => {
   it("converts currency and period", () => {
      expect(toUsdPerMonth(4000, "USD", "month")).toBe(4000);
      expect(toUsdPerMonth(120000, "USD", "year")).toBe(10000);
      expect(toUsdPerMonth(1, "XYZ", "month")).toBeUndefined();
   });
});
