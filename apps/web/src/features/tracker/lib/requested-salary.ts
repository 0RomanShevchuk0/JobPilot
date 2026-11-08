import type { ProfileCurrency, RequestedSalary, SalaryPeriod } from "@jobpilot/contracts";

/** The currency and period a requested salary is picked in when a row has none yet. */
export interface RequestedSalaryUnits {
   currency: ProfileCurrency;
   period: SalaryPeriod;
}

/** When the profile names none: the most common in the job sites' salaries. */
export const defaultRequestedSalaryUnits: RequestedSalaryUnits = {
   currency: "USD",
   period: "month",
};

/** "3 000 USD / month", the amount grouped as my locale groups it. */
export function salaryText({ amount, currency, period }: RequestedSalary): string {
   return `${amount.toLocaleString()} ${currency} / ${period}`;
}
