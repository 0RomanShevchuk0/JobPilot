import {
   CannotApplyError,
   choiceFieldKinds,
   SessionExpiredError,
   type ApplyForm,
   type ApplyFormField,
   type FormField,
   type FormFieldValueSource,
   type PrepareApplicationJobData,
   type Profile,
} from "@jobpilot/contracts";
import type { ApplicationToPrepare, DatabaseClient, VacancyForMatching } from "@jobpilot/db";
import type { LlmProvider } from "@jobpilot/llm";
import {
   buildApplicationAnswersRequest,
   buildApplicationMessageRequest,
   pickNumber,
   pickOption,
   tidyAnswer,
   usualApplicationMessage,
} from "@jobpilot/matching";
import { type Job, UnrecoverableError } from "bullmq";
import { LOGIN_HINT } from "../config.js";
import { log } from "../log.js";
import { loadSession } from "../session.js";
import { findSource, type SourceEntry } from "../sources.js";

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
         err instanceof SessionExpiredError
            ? `${err.message}: ${LOGIN_HINT}, then prepare again`
            : (err as Error).message;
      if (err instanceof SessionExpiredError) {
         await database.sourceSessions.markExpired(application.userId, application.source);
      }
      // the site says I applied to this job myself: what Apply was for is done, so it is marked sent
      // by hand, as I'd mark it, and joins the tracker; Undo takes it back. Dated today: the site
      // doesn't say when
      if (err instanceof CannotApplyError && err.alreadyApplied) {
         const { userId, postingId } = application;
         await database.applications.markSentByHand(userId, postingId, reason);
         log("prepare-application", `marked sent by hand: ${reason}`);
         return reason;
      }
      // not an error: the job site takes no application here, trying again won't change that. This
      // posting only: the vacancy's other job sites may well take one (it stays new while one does).
      // The job completes, so it is neither retried nor reported to Sentry
      if (err instanceof CannotApplyError) {
         await database.applications.setCannotApply(applicationId, reason);
         log("prepare-application", `cannot apply: ${reason}`);
         return reason;
      }
      // a final failure must not leave the application "preparing" forever
      if (err instanceof UnrecoverableError || err instanceof SessionExpiredError || lastAttempt) {
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
   const entry = findSource(source);
   if (!entry) throw new UnrecoverableError(`No adapter for source ${source}`);
   const stored = await database.profiles.get(userId);
   if (!stored) throw new UnrecoverableError("No profile yet");
   const vacancy = vacancyId ? await database.vacancies.getForMatching(vacancyId) : undefined;
   if (!vacancy) throw new UnrecoverableError("The vacancy is gone");

   // the questions are read from the job site once; answering again reuses them
   const form =
      refreshForm || application.fields.length === 0
         ? await readForm(entry, postingUrl, userId, database)
         : storedForm(application.fields);
   // a form with only a CV field has nothing for the model to write
   const material =
      form.questions.length > 0 || form.message
         ? await loadMaterial(database, userId, stored.profile, vacancy)
         : undefined;
   // independent of each other, so at once; a failed answer still fails the job, as before
   const [answers, message] = await Promise.all([
      material && form.questions.length > 0 ? answerQuestions(llm, material, form.questions) : [],
      material && form.message ? writeMessage(llm, material) : undefined,
   ]);

   const fields = form.questions.map((q, i) => formField(q, "ai", answers[i]));
   if (form.message && message) {
      fields.push(formField(form.message, message.valueSource, message.text));
   }
   if (form.cv) {
      const baseCv = await database.documents.getBaseCvFileInfo(userId);
      if (!baseCv) {
         throw new UnrecoverableError("The form asks for a CV: upload yours in Documents");
      }
      // shows which file goes in; filling attaches the base CV as it is then
      fields.push(formField(form.cv, "document", baseCv.fileName));
   }
   await database.applications.setPrepared(applicationId, fields);
   log(
      "prepare-application",
      `${vacancy.title}: ${form.questions.length} questions answered, ready for review`,
   );
   return fields.length;
}

/** What the answers and the message are written from: the candidate, their CV and the vacancy. */
interface ApplicationMaterial {
   profile: Profile;
   vacancy: VacancyForMatching;
   cv?: string;
   /** the scoring's strongest matches, to lead with */
   matchedSkills: string[];
}

/** The profile and the vacancy with the user's CV and the scoring's strongest matches for it. */
async function loadMaterial(
   database: DatabaseClient,
   userId: string,
   profile: Profile,
   vacancy: VacancyForMatching,
): Promise<ApplicationMaterial> {
   const [cv, match] = await Promise.all([
      database.documents.getBaseCvText(userId),
      database.matches.get(userId, vacancy.id),
   ]);
   return { profile, vacancy, cv, matchedSkills: match?.analysis.ai?.matchedSkills ?? [] };
}

/**
 * The message to the recruiter, written for this vacancy; the user's usual one when the model fails, so
 * it never holds the application back: the user reviews and edits the message either way.
 */
async function writeMessage(
   llm: LlmProvider,
   material: ApplicationMaterial,
): Promise<{ valueSource: FormFieldValueSource; text: string }> {
   try {
      const request = buildApplicationMessageRequest(material);
      const { message } = await llm.generate(request);
      const text = tidyAnswer(message);
      if (!text) throw new Error("the model wrote an empty message");
      return { valueSource: "ai-message", text };
   } catch (err) {
      log("prepare-application", `the usual message instead: ${(err as Error).message}`);
   }
   return { valueSource: "profile", text: usualApplicationMessage(material.profile) };
}

/**
 * One answer per question, in their order, from the CV, the profile and the vacancy. A choice question's
 * answer is one of its options, as the form writes it.
 */
async function answerQuestions(
   llm: LlmProvider,
   material: ApplicationMaterial,
   questions: ApplyFormField[],
): Promise<string[]> {
   const questionsForModel = questions.map((q) => ({
      label: q.label,
      options: choiceFieldKinds.includes(q.kind) ? q.options : undefined,
      numeric: q.kind === "number",
   }));
   const request = buildApplicationAnswersRequest({ ...material, questions: questionsForModel });
   const { answers } = await llm.generate(request);
   if (answers.length !== questions.length) {
      throw new Error(`the model answered ${answers.length} of ${questions.length} questions`);
   }
   return questions.map((question, i) => {
      const answer = tidyAnswer(answers[i]!);
      if (question.kind === "number") {
         const number = pickNumber(answer);
         // a number input takes nothing else: thrown, so the job retries, as for a wrong option
         if (!number) {
            throw new Error(`the model answered "${answer}" to "${question.label}", not a number`);
         }
         return number;
      }
      if (!choiceFieldKinds.includes(question.kind) || !question.options) return answer;
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

// A job site sees one account opening application forms: automated opens are spaced out at random,
// like a person going through jobs, each site at its own pace. Jobs run one at a time, so a plain map
// is enough: when the next open is allowed, by source.
const nextOpenAt = new Map<string, number>();

/** Waits until the previous automated open on this site is far enough behind; no wait after a quiet spell. */
async function waitForTurn({ adapter }: SourceEntry): Promise<void> {
   const wait = (nextOpenAt.get(adapter.source) ?? 0) - Date.now();
   if (wait > 0) {
      log(
         "prepare-application",
         `waiting ${Math.round(wait / 1000)}s before opening ${adapter.name} again`,
      );
      await new Promise((resolve) => setTimeout(resolve, wait));
   }
   const { min, max } = adapter.account.formOpenGapMs;
   nextOpenAt.set(adapter.source, Date.now() + min + Math.random() * (max - min));
}

/** The questions, the message and the CV fields as read before, without their answers. */
function storedForm(fields: FormField[]): Pick<ApplyForm, "questions" | "message" | "cv"> {
   const asFormField = ({ name, label, kind, required, options }: FormField): ApplyFormField => ({
      name,
      label,
      kind,
      required,
      options,
   });
   const message = fields.find(
      (f) => f.valueSource === "ai-message" || f.valueSource === "profile",
   );
   const cv = fields.find((f) => f.valueSource === "document");
   return {
      questions: fields.filter((f) => f.valueSource === "ai").map(asFormField),
      message: message && asFormField(message),
      cv: cv && asFormField(cv),
   };
}

async function readForm(
   entry: SourceEntry,
   jobUrl: string,
   userId: string,
   database: DatabaseClient,
): Promise<ApplyForm> {
   // before the wait: without a session there is nothing to wait for
   const session = await loadSession(database, userId, entry);
   await waitForTurn(entry);
   return entry.adapter.account.readApplyForm(jobUrl, session);
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
