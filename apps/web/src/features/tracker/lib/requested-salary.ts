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

const shortPeriods: Record<SalaryPeriod, string> = { hour: "hr", month: "mo", year: "yr" };

/** "$3.5K/mo", "₴150K/mo", "$40/hr": short enough for a column of the tracker. */
export function shortSalaryText({ amount, currency, period }: RequestedSalary): string {
   const shortAmount = amount.toLocaleString(undefined, {
      style: "currency",
      currency,
      // "₴", not "UAH"
      currencyDisplay: "narrowSymbol",
      notation: "compact",
      maximumFractionDigits: 1,
   });
   return `${shortAmount}/${shortPeriods[period]}`;
}
