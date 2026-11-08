import type { ProfileCurrency, SalaryPeriod } from "@jobpilot/contracts";

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
