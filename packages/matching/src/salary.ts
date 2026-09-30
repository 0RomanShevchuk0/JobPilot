import type { SalaryPeriod } from "@jobpilot/contracts";

// Rough rates, good enough to tell "below my minimum" from "above it". Update when they drift noticeably.
const USD_PER_UNIT: Record<string, number> = {
   USD: 1,
   EUR: 1.08,
   GBP: 1.27,
   PLN: 0.25,
   UAH: 0.024,
   CZK: 0.043,
};

const MONTHS_PER: Record<SalaryPeriod, number> = {
   month: 1,
   year: 1 / 12,
   hour: 160, // ~ full-time hours in a month
};

/** Amount in USD per month, or undefined for a currency we have no rate for. */
export function toUsdPerMonth(
   amount: number,
   currency: string,
   period: SalaryPeriod,
): number | undefined {
   const rate = USD_PER_UNIT[currency.toUpperCase()];
   return rate === undefined ? undefined : amount * rate * MONTHS_PER[period];
}
