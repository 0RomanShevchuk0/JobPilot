import type { MatchListItem, Salary, SalaryFit } from "@jobpilot/contracts";

/** The verdict to show: the AI's, else rejected (prefilter or job site) or still waiting for a score. */
export function matchVerdict(match: MatchListItem): string {
   const rejected = match.rejectedBy.length > 0 || match.cannotApplyReason !== null;
   return match.verdict ?? (rejected ? "rejected" : "pending");
}

export const verdictStyles: Record<string, string> = {
   apply: "bg-green-100 text-green-800",
   stretch: "bg-amber-100 text-amber-800",
   skip: "bg-gray-200 text-gray-700",
   rejected: "bg-gray-200 text-gray-700",
   pending: "bg-blue-100 text-blue-800",
};

// what the job site says of the salary, a hidden one too, against the expectations in my profile there
export const salaryFitLabels: Record<SalaryFit, string> = {
   fits: "Salary matches your expectations, says the job site",
   below_expectations: "Salary range is below your expectations, says the job site",
};
export const salaryFitStyles: Record<SalaryFit, string> = {
   fits: "text-green-700",
   below_expectations: "text-amber-700",
};

export function formatSalary(s: Salary): string {
   const range = [s.min, s.max].filter((n) => n !== undefined).join("–");
   return `${range} ${s.currency}/${s.period}`;
}

/** Company, salary and work modes in one line. */
export function matchDetailsLine(match: MatchListItem): string {
   return [match.company, match.salary && formatSalary(match.salary), match.workModes.join(", ")]
      .filter(Boolean)
      .join(" · ");
}

/** The day the job site published or last bumped the vacancy. */
export function formatPublishedDate(match: MatchListItem): string {
   // the job sites are Ukrainian and some give a day only, stored as Kyiv midnight: in another time
   // zone it would show the day before
   return new Date(match.publishedAt).toLocaleDateString(undefined, { timeZone: "Europe/Kyiv" });
}
