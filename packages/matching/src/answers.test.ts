import { profileSchema } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import {
   applicationMessage,
   buildApplicationAnswersRequest,
   pickOption,
   tidyAnswer,
} from "./answers.js";
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
      questions: [
         { label: "Have you worked with Angular?", options: ["Так", "Ні"] },
         { label: "Years with Node.js?" },
      ],
   });

   it("numbers the questions, with the options of a choice one", () => {
      expect(prompt).toContain(
         "# Questions\n1. Have you worked with Angular?\n   Options: Так | Ні\n2. Years with Node.js?",
      );
   });

   it("passes the strongest matches", () => {
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

describe("pickOption", () => {
   it("finds the option the answer names, as the form writes it", () => {
      expect(pickOption("Так", ["Так", "Ні"])).toBe("Так");
      expect(pickOption(" так. ", ["Так", "Ні"])).toBe("Так");
   });

   it("is undefined for an answer that names no option", () => {
      expect(pickOption("Yes, I have shipped Next.js apps.", ["Так", "Ні"])).toBeUndefined();
   });
});
