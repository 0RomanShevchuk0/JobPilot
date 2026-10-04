import type { ProfileContacts } from "@jobpilot/contracts";

const REMOVED = "[removed]";

// "roman.dev+jobs@mail.example.com"
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
// any web address with its scheme: "https://example.com/me"
const HTTP_URL = /https?:\/\/\S+/gi;
// profile links written without a scheme: "linkedin.com/in/someone", "t.me/someone"
const PROFILE_LINK =
   /\b(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|t\.me|telegram\.me|wa\.me|x\.com|twitter\.com)\/\S+/gi;
// a digit, then digits, spaces, dots, dashes or brackets, ending in a digit: "+49 155 66057903", "(067) 123-45-67"
const PHONE_LIKE = /\+?\d[\d\s().-]{6,}\d/g;
// one digit, to count them in a phone-like match
const DIGIT = /\d/g;
// any run of spaces, tabs or line breaks: splits "Jane  Doe" into its parts
const WHITESPACE = /\s+/;
// fewer digits than this is a year range or a number in the text, not a phone
const MIN_PHONE_DIGITS = 9;

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
      .replace(PHONE_LIKE, (match) =>
         (match.match(DIGIT) ?? []).length >= MIN_PHONE_DIGITS ? REMOVED : match,
      );
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
