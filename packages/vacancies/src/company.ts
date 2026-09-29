// Legal forms that don't distinguish companies: "NetEasy LLC" and "NetEasy" are the same employer.
const LEGAL_FORMS = new Set([
   "llc",
   "inc",
   "ltd",
   "limited",
   "corp",
   "corporation",
   "co",
   "gmbh",
   "ag",
   "bv",
   "sro",
   "sp z oo",
   "oy",
   "ab",
   "plc",
   "llp",
   "тов",
   "тзов",
   "фоп",
   "ооо",
]);

/** Key for matching the same employer across postings and sources: "WeHireMediaBuyers Ltd." → "wehiremediabuyers". */
export function normalizeCompanyName(name: string): string {
   let words = name
      .toLowerCase()
      .replace(/\([^)]*\)/g, " ") // "PAR Retail (formerly Stuzo)"
      .replace(/[.,'"«»“”]/g, "") // "s.r.o." → "sro", "Ltd." → "ltd"
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(" ")
      .filter(Boolean);

   // strip trailing legal forms, including multi-word ones like "sp z oo"
   let stripped = true;
   while (stripped && words.length > 1) {
      stripped = false;
      for (const size of [3, 2, 1]) {
         if (words.length > size && LEGAL_FORMS.has(words.slice(-size).join(" "))) {
            words = words.slice(0, -size);
            stripped = true;
            break;
         }
      }
   }
   // and leading ones: "ТОВ Ромашка"
   if (words.length > 1 && LEGAL_FORMS.has(words[0])) words = words.slice(1);

   return words.join(" ");
}
