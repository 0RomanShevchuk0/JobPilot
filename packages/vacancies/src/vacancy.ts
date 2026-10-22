import type { Location, NormalizedPosting, VacancyFields } from "@jobpilot/contracts";
import { normalizeCompanyName } from "./company.js";
import { normalizeSkills } from "./skills.js";
import { normalizeTitle, seniorityFromTitle } from "./title.js";

export interface PostingForMerge {
   postingId: string;
   parsed: NormalizedPosting;
   firstSeenAt: Date;
   goneAt: Date | null;
}

/**
 * Key that identifies the same vacancy across postings: employer + title.
 * Location is left out on purpose: sources write it too differently ("Kyiv", "Київ", "Remote, Ukraine").
 * With a hidden employer there is nothing reliable to match on, so the posting gets a key of its own.
 */
export function vacancyFingerprint(posting: Pick<PostingForMerge, "postingId" | "parsed">): string {
   const company = posting.parsed.company;
   if (!company) return `posting:${posting.postingId}`;
   return `${normalizeCompanyName(company.name)}|${normalizeTitle(posting.parsed.title)}`;
}

/**
 * Builds the vacancy from all of its postings. Recomputed from scratch every time, so the result
 * doesn't depend on the order postings arrived in: postings are sorted by when they were first
 * seen, and each field takes the first non-empty value. The exceptions are united instead:
 * - skills: sources list different ones;
 * - work modes and locations: one source says "remote", another leaves it out, and the earliest one
 *   would hide it. Only open postings count, so a closed one's remote doesn't outlive it; when all
 *   are closed, all count.
 */
export function mergeVacancy(postings: PostingForMerge[]): VacancyFields {
   if (postings.length === 0) throw new Error("mergeVacancy: a vacancy needs at least one posting");
   const ordered = [...postings].sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime());
   const all = ordered.map((p) => p.parsed);
   const first = <T>(pick: (p: NormalizedPosting) => T | undefined): T | undefined =>
      all.map(pick).find((v) => v !== undefined && (!Array.isArray(v) || v.length > 0));

   const goneAt = ordered.map((p) => p.goneAt);
   const allGone = goneAt.every((d) => d !== null);
   const lastGoneAt = Math.max(...goneAt.map((d) => d?.getTime() ?? 0));
   const skills = all.flatMap((p) => p.skills ?? []);
   const open = allGone ? all : ordered.filter((p) => p.goneAt === null).map((p) => p.parsed);
   const workModes = [...new Set(open.flatMap((p) => p.workModes ?? []))];
   const locations = uniqueLocations(open.flatMap((p) => p.locations ?? []));

   return {
      title: all[0].title,
      description: all[0].description,
      seniority: first((p) => p.seniority) ?? first((p) => seniorityFromTitle(p.title)),
      employmentTypes: first((p) => p.employmentTypes) ?? [],
      workModes,
      locations,
      languages: first((p) => p.languages) ?? [],
      salary: first((p) => p.salary),
      skills: normalizeSkills(skills),
      experienceYears: first((p) => p.experienceYears),
      closedAt: allGone ? new Date(lastGoneAt) : null,
   };
}

/** The same place listed by two sources is kept once. */
function uniqueLocations(locations: Location[]): Location[] {
   const seen = new Set<string>();
   return locations.filter((l) => {
      const key = `${l.kind}|${l.country ?? ""}|${l.city ?? ""}|${l.raw}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
   });
}
