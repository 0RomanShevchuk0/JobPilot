import type { DatabaseClient } from "@jobpilot/db";
import { mergeVacancy, normalizeCompanyName, vacancyFingerprint } from "@jobpilot/vacancies";
import type { Job } from "bullmq";
import { log } from "../log.js";
import type { BuildVacancyJobData } from "../queues.js";

/** Posting → its vacancy (found by fingerprint or created) → vacancy fields rebuilt from all its postings. */
export async function handleBuildVacancy(job: Job<BuildVacancyJobData>, database: DatabaseClient) {
   const { postingId } = job.data;
   const parsed = await database.postings.getParsed(postingId);
   if (!parsed) return "not parsed"; // went away before it was ever fetched

   const vacancyId = await database.vacancies.linkPosting({
      postingId,
      fingerprint: vacancyFingerprint({ postingId, parsed }),
      company: parsed.company && {
         name: parsed.company.name,
         normalizedName: normalizeCompanyName(parsed.company.name),
         website: parsed.company.website,
      },
      title: parsed.title,
      description: parsed.description,
   });

   const postings = await database.vacancies.postingsOf(vacancyId);
   const vacancy = mergeVacancy(postings);
   await database.vacancies.update(vacancyId, vacancy);

   log(
      "build-vacancy",
      `${parsed.source} ${parsed.externalId} → vacancy ${vacancyId} ` +
         `(${postings.length} posting${postings.length > 1 ? "s" : ""}${vacancy.closedAt ? ", closed" : ""}): ` +
         `${vacancy.title} [${vacancy.seniority ?? "level?"}]`,
   );
   return vacancyId;
}
