import { z } from "zod";

export type PrefilterCheck =
   | "seniority"
   | "work_mode"
   | "office_city"
   | "candidate_country"
   | "salary"
   | "language"
   | "stop_word"
   | "experience"
   | "company";

export interface RejectReason {
   check: PrefilterCheck;
   detail: string;
}

export interface PrefilterResult {
   passed: boolean;
   /** Every failed check, not just the first: useful to see why a vacancy was dropped. */
   rejectedBy: RejectReason[];
}

/**
 * What the model returns when it scores a vacancy against the profile.
 * The descriptions go into the JSON schema the model sees, so they are written for the model.
 */
export const aiAssessmentSchema = z.object({
   requiredYears: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .describe(
         'Minimum years of professional experience the description asks for ("5+ years" → 5, "3-5 years" → 3); null if it doesn\'t say',
      ),
   roleMismatch: z
      .string()
      .nullable()
      .describe(
         'null when the job is the kind of work the candidate looks for; otherwise why not, e.g. "people management role", "not software development: reviewing AI-generated code"',
      ),
   score: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe("How worth applying this vacancy is for the candidate, 0-100"),
   verdict: z
      .enum(["apply", "stretch", "skip"])
      .describe(
         "apply: meets the main requirements; stretch: asks somewhat more than the candidate has but is realistic; skip: clear mismatch or a deal-breaker",
      ),
   matchedSkills: z.array(z.string()).describe("Required skills the candidate has"),
   missingSkills: z
      .array(z.string())
      .describe("Required (not nice-to-have) skills the candidate lacks"),
   concerns: z
      .array(z.string())
      .describe(
         "Risks found in the text, e.g. people management experience, a higher language level, relocation, salary below target; empty if none",
      ),
   summary: z.string().describe("1-2 sentences: why this score"),
});
export type AiAssessment = z.infer<typeof aiAssessmentSchema>;

/** What is stored in vacancy_matches.analysis. ai is absent until the vacancy is scored. */
export interface MatchAnalysis {
   prefilter: PrefilterResult;
   ai?: AiAssessment;
}
