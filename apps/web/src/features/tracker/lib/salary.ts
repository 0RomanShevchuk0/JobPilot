import type { ProfileCurrency, SalaryPeriod } from "@jobpilot/contracts";

/** The currency and period a salary is picked in when a row has none yet. */
export interface SalaryUnits {
   currency: ProfileCurrency;
   period: SalaryPeriod;
}

/** When the profile names none: the most common in the job sites' salaries. */
export const defaultSalaryUnits: SalaryUnits = { currency: "USD", period: "month" };
