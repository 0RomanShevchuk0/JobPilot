import { z } from "zod";
import type { ApplicationStatus } from "./application.js";
import type { Salary, WorkMode } from "./posting.js";

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

/**
 * Whether the job site lets the user apply, as its job page shows it to them; the reason when it won't
 * ("Already applied…", the job is closed, unmet requirements).
 */
export type ApplyCheck = { canApply: true } | { canApply: false; reason: string };

/**
 * How the job's salary range compares with the expectations in the user's profile on the job site.
 * The site says so even when it hides the range, which is most of the time. fits includes a range above
 * the expectations: the site words it differently but marks it the same way.
 */
export type SalaryFit = "fits" | "below_expectations";

/** What a job page shows a user logged in to the job site. */
export interface JobPageCheck {
   applyCheck: ApplyCheck;
   /** absent when the page doesn't say */
   salaryFit?: SalaryFit;
}

/**
 * What is stored in vacancy_matches.analysis. applyCheck and salaryFit are absent until the job site is
 * asked (or when it couldn't be, e.g. no session), ai until the vacancy is scored.
 */
export interface MatchAnalysis {
   prefilter: PrefilterResult;
   applyCheck?: ApplyCheck;
   salaryFit?: SalaryFit;
   ai?: AiAssessment;
}

/** What the user did with a vacancy; null = new, not looked at yet. */
export const matchStatusSchema = z.enum(["applied", "hidden"]).nullable();
export type MatchStatus = z.infer<typeof matchStatusSchema>;

/**
 * One vacancy in GET /matches: how it was evaluated against the user's current profile.
 * The API's wire format, so dates are ISO strings.
 */
export interface MatchListItem {
   vacancyId: string;
   title: string;
   /** null when the employer is hidden */
   company: string | null;
   /** pages of the vacancy's active postings */
   urls: string[];
   /** null: rejected by the prefilter or not scored yet */
   score: number | null;
   verdict: AiAssessment["verdict"] | null;
   summary: string | null;
   concerns: string[];
   matchedSkills: string[];
   missingSkills: string[];
   /** why the prefilter rejected it; empty when it passed */
   rejectedBy: RejectReason[];
   /** why the job site won't let me apply; null when it will or wasn't asked */
   cannotApplyReason: string | null;
   /** what the job site says of the salary against my expectations there; null when it wasn't asked */
   salaryFit: SalaryFit | null;
   salary: Salary | null;
   workModes: WorkMode[];
   status: MatchStatus;
   evaluatedAt: string;
   /** my application to it through JobPilot, once started */
   application: { id: string; status: ApplicationStatus } | null;
}
