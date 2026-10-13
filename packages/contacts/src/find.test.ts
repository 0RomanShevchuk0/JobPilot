import { describe, expect, it } from "vitest";
import { findContacts } from "./find.js";

const cv = `Jane Doe
Full-stack Developer
+49 151 23456789 | jane.doe+jobs@mail.example.com | linkedin.com/in/jane-doe | t.me/janedoe
Portfolio: https://janedoe.dev/projects
Full-Stack Developer 04/2025 – 08/2026
Served 1 000 000 users. Bachelor's 2021 – 2025. Node.js, React.`;

describe("findContacts", () => {
   it("finds the email, the phone and the profile links, but no other web address", () => {
      expect(findContacts(cv)).toEqual({
         email: "jane.doe+jobs@mail.example.com",
         phone: "+49 151 23456789",
         links: { linkedin: "https://linkedin.com/in/jane-doe", telegram: "https://t.me/janedoe" },
      });
   });

   it("keeps the first link of a site and drops the punctuation after it", () => {
      const text =
         "Code (https://www.GitHub.com/jane), old: github.com/jane-old. X: twitter.com/jane;";
      expect(findContacts(text).links).toEqual({
         github: "https://www.github.com/jane",
         x: "https://twitter.com/jane",
      });
   });

   it("takes no digits of a link or a date range for a phone", () => {
      const text = "linkedin.com/in/jane-123456789 | 2021 - 2025 | (067) 123-45-67";
      expect(findContacts(text).phone).toBe("(067) 123-45-67");
   });

   it("finds nothing in a CV without contacts", () => {
      expect(findContacts("Backend Developer, Node.js, 2021 - 2025")).toEqual({
         email: undefined,
         phone: undefined,
         links: undefined,
      });
   });
});
