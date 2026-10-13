import { type ProfileContacts, profileContactsSchema } from "@jobpilot/contracts";
import { EMAIL, HTTP_URL, isPhone, PHONE_LIKE, PROFILE_LINK } from "./patterns.js";

// punctuation the text puts right after a link: "github.com/jane)." → "github.com/jane"
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;
// a link that starts with its scheme: "https://t.me/jane", not "t.me/jane"
const HAS_SCHEME = /^https?:\/\//i;
// "www." at the start of a host: "www.linkedin.com" → "linkedin.com"
const WWW = /^www\./;

/** The name a found link is saved under, by its host: the profile sites application forms ask for. */
const LINK_NAMES: Record<string, string> = {
   "linkedin.com": "linkedin",
   "github.com": "github",
   "gitlab.com": "gitlab",
   "t.me": "telegram",
   "telegram.me": "telegram",
   "wa.me": "whatsapp",
   "x.com": "x",
   "twitter.com": "x",
};

/**
 * Contacts a text (a CV) states, found by their shape, with no model: the first email, the first phone
 * and one link per profile site of LINK_NAMES; other web addresses are left out. No name: nothing
 * tells it from other words.
 */
export function findContacts(text: string): ProfileContacts {
   const email = text.match(EMAIL)?.find(profileTakesEmail);
   // digits inside an email or a link ("linkedin.com/in/jane-123456789") are no phone
   const withoutAddresses = text
      .replace(EMAIL, " ")
      .replace(HTTP_URL, " ")
      .replace(PROFILE_LINK, " ");
   const phone = withoutAddresses.match(PHONE_LIKE)?.find(isPhone);

   const links: Record<string, string> = {};
   const found = [...(text.match(HTTP_URL) ?? []), ...(text.match(PROFILE_LINK) ?? [])];
   for (const url of found.map(toUrl)) {
      const name = url && LINK_NAMES[url.hostname.replace(WWW, "")];
      if (name && !links[name]) links[name] = url.href;
   }

   return { email, phone, links: Object.keys(links).length > 0 ? links : undefined };
}

/** What the profile takes as an email: the pattern lets through a few it rejects ("a@b.c"). */
function profileTakesEmail(match: string): boolean {
   return profileContactsSchema.shape.email.safeParse(match).success;
}

/** "linkedin.com/in/jane)." → https://linkedin.com/in/jane; undefined when it is no web address. */
function toUrl(found: string): URL | undefined {
   const link = found.replace(TRAILING_PUNCTUATION, "");
   const withScheme = HAS_SCHEME.test(link) ? link : `https://${link}`;
   return URL.canParse(withScheme) ? new URL(withScheme) : undefined;
}
