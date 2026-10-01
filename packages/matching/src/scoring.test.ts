import { profileSchema } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import { buildScoringRequest, type VacancyForScoring } from "./scoring.js";

const profile = profileSchema.parse({
   contacts: { fullName: "Jane Doe", email: "jane@example.com", phone: "+491234567" },
   titles: ["Backend Developer"],
   experienceYears: 4,
   skills: ["Node.js", "PostgreSQL"],
   salary: { min: 2000, target: 3000, currency: "USD", period: "month" },
   locations: [{ kind: "candidate", raw: "Germany", country: "DE" }],
   workModes: ["remote"],
   languages: [{ code: "en", level: "B2" }],
});

const vacancy: VacancyForScoring = {
   title: "Backend Developer (Node.js)",
   description: "We build **payments**.",
   workModes: [],
   locations: [],
   languages: [],
   skills: ["node.js"],
};

describe("buildScoringRequest", () => {
   it("describes the candidate without contacts", () => {
      const { prompt } = buildScoringRequest(profile, vacancy);
      expect(prompt).toContain("Experience: 4 years");
      expect(prompt).toContain("Salary: min 2000, target 3000 USD per month");
      expect(prompt).toContain("Works from: Germany");
      expect(prompt).not.toMatch(/Jane|jane@example\.com|491234567/);
   });

   it("marks what the vacancy doesn't state and wraps the description", () => {
      const { prompt } = buildScoringRequest(profile, vacancy);
      expect(prompt).toContain("Company: hidden");
      expect(prompt).toContain("Salary: not stated");
      expect(prompt).toContain("Required experience: not stated");
      expect(prompt).toContain("<description>\nWe build **payments**.\n</description>");
   });

   it("cuts a very long description", () => {
      const { prompt } = buildScoringRequest(profile, {
         ...vacancy,
         description: "x".repeat(20_000),
      });
      expect(prompt).toContain("[cut]");
      expect(prompt.length).toBeLessThan(16_000);
   });
});
