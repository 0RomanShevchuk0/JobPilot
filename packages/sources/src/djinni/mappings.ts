import type { EmploymentType, SalaryPeriod } from "@jobpilot/contracts";

/** Language names as Djinni prints them → ISO 639-1. Unknown names are skipped rather than guessed. */
export const LANGUAGE_CODES: Record<string, string> = {
   english: "en",
   ukrainian: "uk",
   polish: "pl",
   german: "de",
   french: "fr",
   spanish: "es",
   italian: "it",
   portuguese: "pt",
   dutch: "nl",
   czech: "cs",
   slovak: "sk",
   romanian: "ro",
   hungarian: "hu",
   bulgarian: "bg",
   lithuanian: "lt",
   latvian: "lv",
   estonian: "et",
   swedish: "sv",
   norwegian: "no",
   danish: "da",
   finnish: "fi",
   hebrew: "he",
   turkish: "tr",
   georgian: "ka",
   russian: "ru",
   chinese: "zh",
   japanese: "ja",
   korean: "ko",
   arabic: "ar",
};

/** Djinni writes countries either as ISO codes ("UA") or English names ("Ukraine"). */
export const COUNTRY_CODES: Record<string, string> = {
   ukraine: "UA",
   poland: "PL",
   germany: "DE",
   netherlands: "NL",
   "united kingdom": "GB",
   uk: "GB",
   "united states": "US",
   usa: "US",
   canada: "CA",
   spain: "ES",
   portugal: "PT",
   france: "FR",
   italy: "IT",
   "czech republic": "CZ",
   czechia: "CZ",
   slovakia: "SK",
   romania: "RO",
   hungary: "HU",
   bulgaria: "BG",
   lithuania: "LT",
   latvia: "LV",
   estonia: "EE",
   georgia: "GE",
   cyprus: "CY",
   israel: "IL",
   switzerland: "CH",
   austria: "AT",
   sweden: "SE",
   norway: "NO",
   denmark: "DK",
   finland: "FI",
   ireland: "IE",
   croatia: "HR",
   serbia: "RS",
   moldova: "MD",
   turkey: "TR",
   "united arab emirates": "AE",
};

export function countryCode(value: string): string | undefined {
   const v = value.trim();
   if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
   return COUNTRY_CODES[v.toLowerCase()];
}

/** schema.org employmentType values */
export const EMPLOYMENT_TYPES: Record<string, EmploymentType> = {
   FULL_TIME: "full_time",
   PART_TIME: "part_time",
   CONTRACTOR: "contract",
   TEMPORARY: "contract",
   INTERN: "internship",
};

/** schema.org QuantitativeValue.unitText values */
export const SALARY_PERIODS: Record<string, SalaryPeriod> = {
   HOUR: "hour",
   MONTH: "month",
   YEAR: "year",
};
