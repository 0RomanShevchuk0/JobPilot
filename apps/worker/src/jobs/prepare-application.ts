import type { FormField, PrepareApplicationJobData, Profile } from "@jobpilot/contracts";
import {
   DjinniSessionExpiredError,
   openDjinniContext,
   readDjinniApplyForm,
   type ApplyForm,
   type ApplyFormField,
} from "@jobpilot/apply";
import type { ApplicationToPrepare, DatabaseClient, VacancyForMatching } from "@jobpilot/db";
import type { LlmProvider } from "@jobpilot/llm";
import { applicationMessage, buildApplicationAnswersRequest } from "@jobpilot/matching";
import { type Job, UnrecoverableError } from "bullmq";
import { chromium } from "playwright";
import { config } from "../config.js";
import { log } from "../log.js";

/**
 * The user asked to apply: open the form on the job site with their session, read its questions,
 * answer them and the message with an LLM, and leave the application ready for review. Nothing is
 * filled in or sent here.
 */
export async function handlePrepareApplication(
   job: Job<PrepareApplicationJobData>,
   database: DatabaseClient,
   llm: LlmProvider,
) {
   const { applicationId } = job.data;
   const application = await database.applications.getToPrepare(applicationId);
   if (!application || application.status !== "preparing") return "not preparing";

   try {
      return await prepare(applicationId, application, database, llm);
   } catch (err) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      const reason =
         err instanceof DjinniSessionExpiredError
            ? "Not logged in to Djinni: run `pnpm djinni:login` in apps/worker, then prepare again"
            : (err as Error).message;
      // a final failure must not leave the application "preparing" forever
      if (
         err instanceof UnrecoverableError ||
         err instanceof DjinniSessionExpiredError ||
         lastAttempt
      ) {
         await database.applications.setFailed(applicationId, reason);
         throw new UnrecoverableError(reason);
      }
      throw err;
   }
}

async function prepare(
   applicationId: string,
   application: ApplicationToPrepare,
   database: DatabaseClient,
   llm: LlmProvider,
) {
   const { userId, vacancyId, postingUrl, source } = application;
   if (source !== "djinni")
      throw new UnrecoverableError(`Applying through ${source} is not supported yet`);
   const stored = await database.profiles.get(userId);
   if (!stored) throw new UnrecoverableError("No profile yet");
   const vacancy = vacancyId ? await database.vacancies.getForMatching(vacancyId) : undefined;
   if (!vacancy) throw new UnrecoverableError("The vacancy is gone");

   const form = await readForm(postingUrl);
   const answers =
      form.questions.length > 0
         ? await answerQuestions(database, llm, userId, stored.profile, vacancy, form.questions)
         : [];

   const fields = form.questions.map((q, i) => formField(q, "ai", answers[i]));
   if (form.message) {
      fields.push(formField(form.message, "profile", applicationMessage(stored.profile)));
   }
   await database.applications.setPrepared(applicationId, fields);
   log(
      "prepare-application",
      `${vacancy.title}: ${form.questions.length} questions answered, ready for review`,
   );
   return fields.length;
}

/** One answer per question, in their order, from the CV, the profile and the vacancy. */
async function answerQuestions(
   database: DatabaseClient,
   llm: LlmProvider,
   userId: string,
   profile: Profile,
   vacancy: VacancyForMatching,
   questions: ApplyFormField[],
): Promise<string[]> {
   const match = await database.matches.get(userId, vacancy.id);
   const cv = await database.documents.getBaseCvText(userId);
   const { answers } = await llm.generate(
      buildApplicationAnswersRequest({
         profile,
         vacancy,
         cv,
         matchedSkills: match?.analysis.ai?.matchedSkills ?? [],
         questions: questions.map((q) => q.label),
      }),
   );
   if (answers.length !== questions.length) {
      throw new Error(`the model answered ${answers.length} of ${questions.length} questions`);
   }
   return answers;
}

async function readForm(jobUrl: string): Promise<ApplyForm> {
   const browser = await chromium.launch();
   try {
      return await readDjinniApplyForm(
         await openDjinniContext(browser, config.djinniSessionPath),
         jobUrl,
      );
   } finally {
      await browser.close();
   }
}

function formField(
   field: ApplyFormField,
   valueSource: FormField["valueSource"],
   proposedValue: string,
): FormField {
   return {
      name: field.name,
      label: field.label,
      kind: field.kind,
      required: field.required,
      options: field.options,
      valueSource,
      proposedValue,
      editedByUser: false,
   };
}
