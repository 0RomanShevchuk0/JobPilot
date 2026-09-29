import type { Seniority } from "@jobpilot/contracts";

/** Lowercase words only, so formatting differences don't split one vacancy in two. */
export function normalizeTitle(title: string): string {
   return title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}+#]+/gu, " ")
      .trim();
}

const LEVEL_WORDS: [RegExp, Seniority][] = [
   [/\b(intern|internship|trainee)\b/, "intern"],
   [/\b(junior|jr)\b/, "junior"],
   [/\b(middle|mid)\b/, "middle"],
   [/\b(senior|sr)\b/, "senior"],
   [/\blead\b/, "lead"],
   [/\bprincipal\b/, "principal"],
];

/**
 * The level stated in the title, only when it is unambiguous:
 * "Senior Backend Engineer" → senior, "Strong Middle / Middle+" → middle,
 * "Junior-Middle Developer" → undefined (a range, not one level), "Head of Engineering" → undefined.
 */
export function seniorityFromTitle(title: string): Seniority | undefined {
   const text = normalizeTitle(title);
   const found = new Set(LEVEL_WORDS.filter(([re]) => re.test(text)).map(([, level]) => level));
   return found.size === 1 ? [...found][0] : undefined;
}
