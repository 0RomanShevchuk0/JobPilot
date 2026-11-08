import type { ProfileCurrency, RequestedSalary, SalaryPeriod } from "@jobpilot/contracts";
import { and, eq, isNull } from "drizzle-orm";
import { jobAttempts } from "../../schema.js";

/** A requested salary as the table's three columns: all three null when there is none. */
export function requestedSalaryColumns(salary: RequestedSalary | null) {
   return {
      requestedSalaryAmount: salary?.amount ?? null,
      requestedSalaryCurrency: salary?.currency ?? null,
      requestedSalaryPeriod: salary?.period ?? null,
   };
}

/**
 * A salary from its three columns, a row's requested one or a profile's target (what a new row asks
 * for): null unless all three are there.
 */
export function salaryFromColumns(
   amount: number | null,
   currency: ProfileCurrency | null,
   period: SalaryPeriod | null,
): RequestedSalary | null {
   return amount !== null && currency !== null && period !== null
      ? { amount, currency, period }
      : null;
}

/** The attempts that asked for this salary; null = the ones with none; absent = no condition. */
export function attemptAtSalaryLevelSql(salaryLevel: RequestedSalary | null | undefined) {
   if (salaryLevel === undefined) return undefined;
   if (salaryLevel === null) return isNull(jobAttempts.requestedSalaryAmount);
   return and(
      eq(jobAttempts.requestedSalaryAmount, salaryLevel.amount),
      eq(jobAttempts.requestedSalaryCurrency, salaryLevel.currency),
      eq(jobAttempts.requestedSalaryPeriod, salaryLevel.period),
   );
}
