import { jobAttemptStages, jobAttemptStatuses } from "@jobpilot/contracts";
import { describe, expect, it } from "vitest";
import { jobAttemptSilence } from "./job-attempt-silence.js";

const now = new Date("2026-11-20T12:00:00.000Z");
const exactly14DaysAgo = "2026-11-06T12:00:00.000Z";
const justUnder14DaysAgo = "2026-11-06T12:00:00.001Z";
const longAgo = "2026-01-01T00:00:00.000Z";

const attempt = {
   stage: "applied",
   status: "active",
   appliedAt: longAgo,
   progressChangedAt: null,
} as const;

describe("jobAttemptSilence", () => {
   it("calls an active attempt at the applied stage no_answer", () => {
      expect(jobAttemptSilence(attempt, now)).toBe("no_answer");
   });

   it.each(["replied", "hr", "tech_interview", "test_task", "final"] as const)(
      "calls an active attempt at the %s stage ghosted",
      (stage) => {
         expect(jobAttemptSilence({ ...attempt, stage }, now)).toBe("ghosted");
      },
   );

   it("expects nothing from an offer", () => {
      expect(jobAttemptSilence({ ...attempt, stage: "offer" }, now)).toBeNull();
   });

   it.each(jobAttemptStatuses.filter((status) => status !== "active"))(
      "expects nothing from a %s attempt, at any stage",
      (status) => {
         for (const stage of jobAttemptStages) {
            expect(jobAttemptSilence({ ...attempt, stage, status }, now)).toBeNull();
         }
      },
   );

   it("counts from applying until the stage or status changes", () => {
      expect(jobAttemptSilence({ ...attempt, appliedAt: exactly14DaysAgo }, now)).toBe("no_answer");
      expect(jobAttemptSilence({ ...attempt, appliedAt: justUnder14DaysAgo }, now)).toBeNull();
   });

   it("counts from the last change of the stage or status", () => {
      const changed = (progressChangedAt: string) =>
         jobAttemptSilence({ ...attempt, stage: "hr", progressChangedAt }, now);
      expect(changed(exactly14DaysAgo)).toBe("ghosted");
      expect(changed(justUnder14DaysAgo)).toBeNull();
   });
});
