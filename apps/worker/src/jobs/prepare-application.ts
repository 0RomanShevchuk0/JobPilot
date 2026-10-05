import type { FormField, PrepareApplicationJobData, Profile } from "@jobpilot/contracts";
import {
   DjinniCannotApplyError,
   DjinniSessionExpiredError,
   launchBrowser,
   openDjinniContext,
   readDjinniApplyForm,
   type ApplyForm,
   type ApplyFormField,
} from "@jobpilot/apply";
import type { ApplicationToPrepare, DatabaseClient, VacancyForMatching } from "@jobpilot/db";
import type { LlmProvider } from "@jobpilot/llm";
import {
   applicationMessage,
   buildApplicationAnswersRequest,
   pickOption,
   tidyAnswer,
} from "@jobpilot/matching";
import { type Job, UnrecoverableError } from "bullmq";
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
   const { applicationId, refreshForm = false } = job.data;
   const application = await database.applications.getToPrepare(applicationId);
   if (!application || application.status !== "preparing") return "not preparing";

   try {
      return await prepare(applicationId, application, refreshForm, database, llm);
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
         err instanceof DjinniCannotApplyError ||
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
   refreshForm: boolean,
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

   // the questions are read from the job site once; answering again reuses them
   const form =
      refreshForm || application.fields.length === 0
         ? await readForm(postingUrl)
         : storedForm(application.fields);
   const answers =
      form.questions.length > 0
         ? await answerQuestions(database, llm, userId, stored.profile, vacancy, form.questions)
         : [];

   const fields = form.questions.map((q, i) => formField(q, "ai", answers[i]));
   if (form.message) {
      const message = applicationMessage(stored.profile);
      fields.push(formField(form.message, "profile", message));
   }
   await database.applications.setPrepared(applicationId, fields);
   log(
      "prepare-application",
      `${vacancy.title}: ${form.questions.length} questions answered, ready for review`,
   );
   return fields.length;
}

// questions answered with one of their options; their options go to the model and the answer is one
const CHOICE_KINDS: ApplyFormField["kind"][] = ["radio", "select"];

/**
 * One answer per question, in their order, from the CV, the profile and the vacancy. A choice question's
 * answer is one of its options, as the form writes it.
 */
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
   const questionsForModel = questions.map((q) => ({
      label: q.label,
      options: CHOICE_KINDS.includes(q.kind) ? q.options : undefined,
   }));
   const request = buildApplicationAnswersRequest({
      profile,
      vacancy,
      cv,
      matchedSkills: match?.analysis.ai?.matchedSkills ?? [],
      questions: questionsForModel,
   });
   const { answers } = await llm.generate(request);
   if (answers.length !== questions.length) {
      throw new Error(`the model answered ${answers.length} of ${questions.length} questions`);
   }
   return questions.map((question, i) => {
      const answer = tidyAnswer(answers[i]!);
      if (!CHOICE_KINDS.includes(question.kind) || !question.options) return answer;
      const option = pickOption(answer, question.options);
      // thrown, so the job retries: the model usually gets it right the next time
      if (!option) {
         const expected = question.options.join(", ");
         throw new Error(
            `the model answered "${answer}" to "${question.label}", not one of: ${expected}`,
         );
      }
      return option;
   });
}

// Djinni sees one account opening application forms: automated opens are spaced out at random,
// like a person going through jobs. Jobs run one at a time, so a plain variable is enough.
const MIN_GAP_MS = 60_000;
const MAX_GAP_MS = 150_000;
let nextOpenAt = 0;

/** Waits until the previous automated open is far enough behind; no wait after a quiet spell. */
async function waitForTurn(): Promise<void> {
   const wait = nextOpenAt - Date.now();
   if (wait > 0) {
      log("prepare-application", `waiting ${Math.round(wait / 1000)}s before opening Djinni again`);
      await new Promise((resolve) => setTimeout(resolve, wait));
   }
   nextOpenAt = Date.now() + MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
}

/** The questions and the message field as read before, without their answers. */
function storedForm(fields: FormField[]): Pick<ApplyForm, "questions" | "message"> {
   const asFormField = ({ name, label, kind, required, options }: FormField): ApplyFormField => ({
      name,
      label,
      kind,
      required,
      options,
   });
   const message = fields.find((f) => f.valueSource === "profile");
   return {
      questions: fields.filter((f) => f.valueSource === "ai").map(asFormField),
      message: message && asFormField(message),
   };
}

async function readForm(jobUrl: string): Promise<ApplyForm> {
   await waitForTurn();
   const browser = await launchBrowser();
   try {
      const context = await openDjinniContext(browser, config.djinniSessionPath);
      return await readDjinniApplyForm(context, jobUrl);
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
