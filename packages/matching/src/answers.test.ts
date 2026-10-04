import { profileSchema } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import { applicationMessage, buildApplicationAnswersRequest, tidyAnswer } from "./answers.js";
import type { VacancyForPrompt } from "./describe.js";

const profile = profileSchema.parse({
   contacts: { fullName: "Jane Doe", email: "jane@example.com" },
   experienceYears: 4,
   applicationMessage: "I'm interested in this position.",
});
const vacancy: VacancyForPrompt = {
   title: "Full Stack Developer",
   description: "Node.js and Angular.",
   workModes: [],
   locations: [],
   languages: [],
   skills: [],
};

describe("buildApplicationAnswersRequest", () => {
   const { prompt } = buildApplicationAnswersRequest({
      profile,
      vacancy,
      cv: "Jane Doe\njane@example.com\nBuilt a CRM with React",
      matchedSkills: ["Node.js", "React"],
      questions: ["Have you worked with Angular?", "Years with Node.js?"],
   });

   it("numbers the questions and passes the strongest matches", () => {
      expect(prompt).toContain(
         "# Questions\n1. Have you worked with Angular?\n2. Years with Node.js?",
      );
      expect(prompt).toContain("# Strongest matches with this vacancy\nNode.js, React");
   });

   it("keeps contacts out of the prompt", () => {
      expect(prompt).not.toMatch(/Jane Doe|jane@example\.com/);
      expect(prompt).toContain("Built a CRM with React");
   });
});

describe("applicationMessage", () => {
   it("is the user's usual message as it is", () => {
      expect(applicationMessage(profile)).toBe("I'm interested in this position.");
   });

   it("falls back to a neutral message when the profile has none", () => {
      expect(applicationMessage({ ...profile, applicationMessage: "  " })).toMatch(
         /^I'm interested/,
      ); // the default one
   });
});

describe("tidyAnswer", () => {
   it("turns long and medium dashes into hyphens", () => {
      expect(tidyAnswer(" 4 years — across all roles, 2022–2026 ")).toBe(
         "4 years - across all roles, 2022-2026",
      );
   });
});
