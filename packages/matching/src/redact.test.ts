import { describe, expect, it } from "vitest";
import { redactContacts } from "./redact.js";

const cv = `Jane Doe
Full-stack Developer
+49 151 23456789 | jane.doe+jobs@mail.example.com | linkedin.com/in/jane-doe | t.me/janedoe
Portfolio: https://janedoe.dev/projects
Full-Stack Developer 04/2025 – 08/2026
Served 1 000 000 users. Bachelor's 2021 – 2025. Node.js, React.`;

describe("redactContacts", () => {
   const redacted = redactContacts(cv, { fullName: "Jane Doe", phone: "+491512345" });

   it("removes the name, emails, phones and profile links", () => {
      expect(redacted).not.toMatch(/Jane Doe|23456789|jane\.doe|linkedin|t\.me|janedoe/);
      expect(redacted.split("\n")[0]).toBe("[removed]");
      expect(redacted).toContain("Portfolio: [removed]");
   });

   it("removes parts of the name standing on their own, but not inside other words", () => {
      const text = "t.me/jane doe | Doe Ltd | Doerte Street | DOE";
      expect(redactContacts(text, { fullName: "Jane Doe" })).toBe(
         "[removed] [removed] | [removed] Ltd | Doerte Street | [removed]",
      );
   });

   it("keeps dates, numbers and dotted skill names", () => {
      expect(redacted).toContain("04/2025 – 08/2026");
      expect(redacted).toContain("Served 1 000 000 users. Bachelor's 2021 – 2025. Node.js, React.");
   });
});
