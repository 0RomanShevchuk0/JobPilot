import type { Profile } from "@jobpilot/contracts";

/**
 * Whether two versions of a profile evaluate vacancies alike. Everything in the profile goes into the
 * prefilter or the AI prompt except the contacts (used only to cut them out of the CV), the message
 * to recruiters and the sites to search (they decide what is found, not how it is evaluated). A change
 * there (a new phone number) leaves every evaluation as it is; any other one, a field added later
 * included, makes them all stale.
 */
export function sameForMatching(a: Profile, b: Profile): boolean {
   return canonicalJson(matchingInput(a)) === canonicalJson(matchingInput(b));
}

/**
 * Whether the second version picks a category the first didn't, on any source. Vacancies already found
 * in it (for other users) have no evaluation for this one yet: they need one, the rest stay as they are.
 */
export function picksNewCategories(before: Profile, after: Profile): boolean {
   return Object.entries(after.sourceCategories).some(([source, categories]) => {
      const had = before.sourceCategories[source] ?? [];
      return categories.some((category) => !had.includes(category));
   });
}

function matchingInput(profile: Profile): Partial<Profile> {
   const input: Partial<Profile> = { ...profile };
   delete input.contacts;
   delete input.applicationMessage;
   delete input.sourceCategories;
   return input;
}

/** JSON with object keys sorted: Postgres jsonb gives keys back in its own order, not the one saved. */
function canonicalJson(value: unknown): string {
   return JSON.stringify(value, (_key, v: unknown) =>
      v && typeof v === "object" && !Array.isArray(v)
         ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
         : v,
   );
}
