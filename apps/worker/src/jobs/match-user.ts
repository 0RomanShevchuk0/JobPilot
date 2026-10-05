import type { MatchUserJobData, MatchVacancyJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import type { Job, Queue } from "bullmq";
import { log } from "../log.js";
import { matchVacancyJobOptions } from "../queues.js";

/** A user's profile changed: queue an evaluation of every open vacancy for them. */
export async function handleMatchUser(
   job: Job<MatchUserJobData>,
   database: DatabaseClient,
   matchVacancyQueue: Queue<MatchVacancyJobData>,
) {
   const { userId } = job.data;
   const vacancyIds = await database.vacancies.listOpenIds();
   const jobs = vacancyIds.map((vacancyId) => ({
      name: "match-vacancy",
      data: { userId, vacancyId },
      opts: matchVacancyJobOptions(userId, vacancyId),
   }));
   await matchVacancyQueue.addBulk(jobs);
   log("match-user", `${userId}: ${vacancyIds.length} open vacancies queued for evaluation`);
   return vacancyIds.length;
}
