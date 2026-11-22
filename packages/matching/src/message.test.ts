import { profileSchema } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import type { VacancyForPrompt } from "./describe.js";
import { buildApplicationMessageRequest, usualApplicationMessage } from "./message.js";

const profile = profileSchema.parse({
   contacts: { fullName: "Jane Doe", email: "jane@example.com" },
   experienceYears: 4,
   notes: "Best stories: moved 100,000 records to a new schema with no downtime.",
   applicationMessage: "I'm interested in this position.",
});
const vacancy: VacancyForPrompt = {
   title: "Backend Developer",
   description: "Node.js and PostgreSQL.",
   workModes: [],
   locations: [],
   languages: [],
   skills: [],
};

describe("buildApplicationMessageRequest", () => {
   const { prompt } = buildApplicationMessageRequest({
      profile,
      vacancy,
      cv: "Jane Doe\njane@example.com\nBuilt a CRM with React",
      matchedSkills: ["Node.js"],
   });

   it("writes from the notes, the CV, the vacancy and the strongest matches", () => {
      expect(prompt).toContain("moved 100,000 records");
      expect(prompt).toContain("Built a CRM with React");
      expect(prompt).toContain("Title: Backend Developer");
      expect(prompt).toContain("# Strongest matches with this vacancy\nNode.js");
   });

   it("keeps contacts out of the prompt", () => {
      expect(prompt).not.toMatch(/Jane Doe|jane@example\.com/);
   });
});

describe("usualApplicationMessage", () => {
   it("is the user's usual message as it is", () => {
      expect(usualApplicationMessage(profile)).toBe("I'm interested in this position.");
   });

   it("falls back to a neutral message when the profile has none", () => {
      expect(usualApplicationMessage({ ...profile, applicationMessage: "  " })).toMatch(
         /^I'm interested/,
      ); // the default one
   });
});
