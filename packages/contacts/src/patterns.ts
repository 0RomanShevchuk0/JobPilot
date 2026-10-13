// What a contact looks like in a text: redacting and finding take the same ones.

// "roman.dev+jobs@mail.example.com"
export const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
// any web address with its scheme: "https://example.com/me"
export const HTTP_URL = /https?:\/\/\S+/gi;
// profile links written without a scheme: "linkedin.com/in/someone", "t.me/someone"
export const PROFILE_LINK =
   /\b(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|t\.me|telegram\.me|wa\.me|x\.com|twitter\.com)\/\S+/gi;
// a digit or a bracket, then digits, spaces, dots, dashes or brackets, ending in a digit:
// "+49 155 66057903", "(067) 123-45-67"
export const PHONE_LIKE = /\+?\(?\d[\d\s().-]{6,}\d/g;
// one digit, to count them in a phone-like match
const DIGIT = /\d/g;
// fewer digits than this is a year range or a number in the text, not a phone
const MIN_PHONE_DIGITS = 9;

/** A phone-like match with enough digits for a phone: "2021 - 2025" is a year range. */
export function isPhone(match: string): boolean {
   return (match.match(DIGIT) ?? []).length >= MIN_PHONE_DIGITS;
}
