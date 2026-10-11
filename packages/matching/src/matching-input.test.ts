import { type Profile, profileSchema } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import { sameForMatching } from "./matching-input.js";

const profile = profileSchema.parse({
   contacts: { fullName: "Jane Doe", email: "jane@example.com" },
   titles: ["Backend Developer"],
   skills: ["Node.js"],
   locations: [{ kind: "candidate", raw: "Germany", country: "DE" }],
   hardFilters: { seniorities: ["middle"], stopWords: ["PHP"] },
   applicationMessage: "Hi!",
});

const edit = (change: Partial<Profile>): Profile => ({ ...profile, ...change });

describe("sameForMatching", () => {
   it("ignores the contacts and the message to recruiters", () => {
      const other = edit({
         contacts: { fullName: "Jane Doe", phone: "+491234567" },
         applicationMessage: "Hello there",
      });
      expect(sameForMatching(profile, other)).toBe(true);
   });

   it("sees a change the prefilter reads", () => {
      const other = edit({ hardFilters: { ...profile.hardFilters, stopWords: ["PHP", "Java"] } });
      expect(sameForMatching(profile, other)).toBe(false);
   });

   it("sees a change the AI prompt reads", () => {
      expect(sameForMatching(profile, edit({ skills: ["Node.js", "React"] }))).toBe(false);
   });

   it("ignores the order of keys, as jsonb returns them", () => {
      const reordered = edit({
         locations: [{ country: "DE", raw: "Germany", kind: "candidate" }],
         hardFilters: { stopWords: ["PHP"], seniorities: ["middle"] },
      });
      expect(sameForMatching(profile, reordered)).toBe(true);
   });
});
