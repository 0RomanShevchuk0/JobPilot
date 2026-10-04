import type { ScoreVacancyJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import type { LlmProvider } from "@jobpilot/llm";
import { applyHardLimits, buildScoringRequest, SCORING_PROMPT_VERSION } from "@jobpilot/matching";
import type { Job } from "bullmq";
import { log } from "../log.js";

/** One prefiltered vacancy × one user → LLM → score and AI analysis in vacancy_matches. */
export async function handleScoreVacancy(
   job: Job<ScoreVacancyJobData>,
   database: DatabaseClient,
   llm: LlmProvider,
) {
   const { userId, vacancyId } = job.data;

   const stored = await database.profiles.get(userId);
   if (!stored) return "no profile";
   const vacancy = await database.vacancies.getForMatching(vacancyId);
   if (!vacancy || vacancy.closedAt) return "closed";
   // match-vacancy decides what to score; if the evaluation changed since, a newer job is on its way
   const match = await database.matches.get(userId, vacancyId);
   if (!match || match.profileVersion !== stored.version || !match.prefilterPassed) return "stale";
   if (match.promptVersion === SCORING_PROMPT_VERSION) return "up to date";

   // errors (rate limits, timeouts, an answer that fails the schema) throw here and the queue retries
   const cv = await database.documents.getBaseCvText(userId);
   const answer = await llm.generate(buildScoringRequest(stored.profile, vacancy, cv));
   const ai = applyHardLimits(stored.profile, answer);

   const saved = await database.matches.saveAssessment(userId, vacancyId, stored.version, {
      ai,
      model: llm.model,
      promptVersion: SCORING_PROMPT_VERSION,
   });
   if (!saved) return "stale"; // the profile or the vacancy changed while the model was answering

   log("score-vacancy", `${ai.score} ${ai.verdict} ${vacancy.title} — ${ai.summary}`);
   return ai.score;
}
