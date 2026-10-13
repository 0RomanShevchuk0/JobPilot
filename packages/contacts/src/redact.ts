import type { ProfileContacts } from "@jobpilot/contracts";
import { EMAIL, HTTP_URL, isPhone, PHONE_LIKE, PROFILE_LINK } from "./patterns.js";

const REMOVED = "[removed]";

// any run of spaces, tabs or line breaks: splits "Jane  Doe" into its parts
const WHITESPACE = /\s+/;

/**
 * Takes contact details out of a text (a CV) before it goes to a model: no prompt needs them, and the
 * free Gemini tier may use what it is sent. Removes the profile's own contacts and anything shaped like
 * an email, a phone or a profile link, since a CV can carry other contacts than the profile.
 */
export function redactContacts(text: string, contacts: ProfileContacts): string {
   const own = [
      contacts.fullName,
      contacts.email,
      contacts.phone,
      ...Object.values(contacts.links ?? {}),
   ];
   let result = text;
   for (const value of own) if (value) result = result.split(value).join(REMOVED);

   // parts of the name on their own, any case: "t.me/r0man shevchuk" leaves "shevchuk" behind
   for (const part of contacts.fullName?.split(WHITESPACE) ?? []) {
      if (part.length < 3) continue; // initials and short particles would hit ordinary words
      result = result.replace(wholeWord(part), REMOVED);
   }

   return result
      .replace(EMAIL, REMOVED)
      .replace(HTTP_URL, REMOVED)
      .replace(PROFILE_LINK, REMOVED)
      .replace(PHONE_LIKE, (match) => (isPhone(match) ? REMOVED : match));
}

/** "Doe" as a word, any case: matches "doe" and "DOE", not the "Doe" inside "Doerte". */
function wholeWord(word: string): RegExp {
   // no letter (of any alphabet) right before or right after the word
   return new RegExp(`(?<!\\p{L})${escapeRegExp(word)}(?!\\p{L})`, "giu");
}

/** "Node.js" → "Node\.js": a literal string inside a regular expression. */
function escapeRegExp(text: string): string {
   return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // put a backslash before every special character
}
