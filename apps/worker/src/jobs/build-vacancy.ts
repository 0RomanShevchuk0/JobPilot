import type { BuildVacancyJobData, MatchVacancyJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { mergeVacancy, normalizeCompanyName, vacancyFingerprint } from "@jobpilot/vacancies";
import type { Job, Queue } from "bullmq";
import { log } from "../log.js";
import { matchVacancyJobOptions } from "../queues.js";

/**
 * Posting → its vacancy (found by fingerprint or created) → vacancy fields rebuilt from all its postings
 * → an open vacancy is queued for evaluation for every user; match-vacancy skips what is up to date.
 */
export async function handleBuildVacancy(
   job: Job<BuildVacancyJobData>,
   database: DatabaseClient,
   matchVacancyQueue: Queue<MatchVacancyJobData>,
) {
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
   const changed = await database.vacancies.update(vacancyId, vacancy);

   if (!vacancy.closedAt) {
      const userIds = await database.users.listIds();
      await matchVacancyQueue.addBulk(
         userIds.map((userId) => ({
            name: "match-vacancy",
            data: { userId, vacancyId },
            opts: matchVacancyJobOptions(userId, vacancyId),
         })),
      );
   }

   log(
      "build-vacancy",
      `${parsed.source} ${parsed.externalId} → vacancy ${vacancyId} ` +
         `(${postings.length} posting${postings.length > 1 ? "s" : ""}${vacancy.closedAt ? ", closed" : ""}${changed ? "" : ", unchanged"}): ` +
         `${vacancy.title} [${vacancy.seniority ?? "level?"}]`,
   );
   return vacancyId;
}
