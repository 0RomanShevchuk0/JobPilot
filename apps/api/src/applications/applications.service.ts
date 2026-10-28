import {
   choiceFieldKinds,
   type ApplicationListItem,
   type ApplicationListPage,
   type ApplicationView,
   type FillAnswer,
   type FillReport,
   type FormField,
   type FormToFill,
} from "@jobpilot/contracts";
import type { ApplicationListOptions } from "@jobpilot/db";
import {
   BadRequestException,
   ConflictException,
   Injectable,
   NotFoundException,
} from "@nestjs/common";
import { Database } from "../infra/database.js";
import { RedisService } from "../infra/redis.service.js";
import { ApplicationQueue } from "./application-queue.service.js";

// applications per page of a list: a row is a line, a page fills a screen or two
const PAGE_SIZE = 30;

@Injectable()
export class ApplicationsService {
   constructor(
      private readonly db: Database,
      private readonly queue: ApplicationQueue,
      private readonly redis: RedisService,
   ) {}

   /**
    * Starts preparing an application through one of the vacancy's job sites: the worker reads the form
    * and answers it. Preparing the same posting again answers the same questions anew, without opening
    * the job site; refreshForm reads the form again first. Refused before the user's first login on the
    * site: the worker reads the form with their session, which only the extension sends.
    */
   async prepare(userId: string, postingId: string, refreshForm: boolean): Promise<{ id: string }> {
      const posting = await this.db.applications.getPostingToApply(postingId);
      if (!posting) throw new NotFoundException("The job is no longer on this site");
      if (posting.externalApplyUrl) {
         throw new ConflictException(
            `This job is applied to on the employer's site: ${posting.externalApplyUrl}`,
         );
      }
      // no application without the session: it would only fail. An expired one goes on, the worker
      // finds it out and asks for a new login
      if (!(await this.db.sourceSessions.getEncryptedSession(userId, posting.sourceId))) {
         throw new ConflictException(
            `Applying through JobPilot needs the JobPilot extension: install it in Chrome and log in to ${posting.sourceName} there, then apply again`,
         );
      }
      const application = await this.db.applications.startPreparing(userId, postingId);
      if (!application) throw new ConflictException("Already applied through this site");
      await this.queue.prepare(application.id, refreshForm);
      return application;
   }

   /**
    * The extension starts filling the form on the job page in the user's browser: what to put in it.
    * The application counts as open in a browser until the extension reports how it ended, or for as
    * long as a form waits for the user. Returns undefined when there is no such application.
    */
   async claimForFilling(userId: string, applicationId: string): Promise<FormToFill | undefined> {
      const application = await this.db.applications.get(userId, applicationId);
      if (!application) return undefined;
      assertReadyToFill(application);
      const toFill = await this.db.applications.getToFill(applicationId);
      if (!toFill) return undefined;
      const answers = await this.answersToFill(userId, toFill.fields);

      // the last filling's problem is out of date; a new one records its own
      await this.db.applications.clearFillProblem(applicationId);
      await this.redis.client.set(fillingKey(applicationId), "1", "EX", FILLING_TTL_SECONDS);
      return {
         title: application.title,
         source: toFill.source,
         jobUrl: toFill.postingUrl,
         answers,
      };
   }

   /**
    * How filling in the browser ended, as the extension reports it: sent (the vacancy moves to Applied,
    * as if marked there), the tab closed, or a problem shown with the answers. Returns false when there
    * is no such application.
    */
   async recordFillOutcome(
      userId: string,
      applicationId: string,
      report: FillReport,
   ): Promise<boolean> {
      const application = await this.db.applications.get(userId, applicationId);
      if (!application) return false;
      await this.redis.client.del(fillingKey(applicationId));
      switch (report.status) {
         case "submitted":
            await this.db.applications.setSubmitted(applicationId);
            return true;
         case "cancelled":
            return true;
         case "failed":
            await this.db.applications.setFillProblem(applicationId, report.reason);
            return true;
      }
   }

   /** The answers to put into the form; the CV field gets the base CV, for the extension to download. */
   private async answersToFill(userId: string, fields: FormField[]): Promise<FillAnswer[]> {
      const needsCv = fields.some((f) => f.valueSource === "document");
      const cv = needsCv ? await this.db.documents.getBaseCvFileInfo(userId) : undefined;
      return fields.map((f): FillAnswer => {
         // the CV field, the only file a form gets: the base CV as it is now, not as when prepared
         if (f.valueSource === "document") {
            if (!cv) {
               throw new ConflictException(
                  "No CV to attach: upload yours in Documents, then fill again",
               );
            }
            return { name: f.name, kind: "file", document: { id: cv.id, fileName: cv.fileName } };
         }
         if (f.kind === "file") throw new ConflictException(`No file to attach for "${f.label}"`);
         return { name: f.name, kind: f.kind, value: f.finalValue ?? f.proposedValue ?? "" };
      });
   }

   /** The form is open in the extension's tab, as far as the API knows (see FILLING_TTL_SECONDS). */
   private async isFilling(applicationId: string): Promise<boolean> {
      return (await this.redis.client.exists(fillingKey(applicationId))) > 0;
   }

   /**
    * Saves my own answers in place of the proposed ones, by field name: only while the answers are up
    * for review and not open in the browser. A value equal to the proposed one undoes the edit.
    * Returns false when there is no such application.
    */
   async saveAnswers(
      userId: string,
      applicationId: string,
      values: { name: string; value: string }[],
   ): Promise<boolean> {
      const application = await this.db.applications.get(userId, applicationId);
      if (!application) return false;
      if (application.status !== "ready_for_review") {
         throw new ConflictException(
            `The application is ${application.status}: its answers can't be changed`,
         );
      }
      if (await this.isFilling(applicationId)) {
         throw new ConflictException(
            "The form is open in your browser: close its tab, then change the answers",
         );
      }

      const answers = new Map(values.map((v) => [v.name, v.value]));
      const unknown = [...answers.keys()].find(
         (name) => !application.fields.some((f) => f.name === name),
      );
      if (unknown) throw new BadRequestException(`No field "${unknown}" in this application`);
      const fields = application.fields.map((field) => {
         const value = answers.get(field.name);
         return value === undefined ? field : withAnswer(field, value);
      });

      const saved = await this.db.applications.saveFields(applicationId, fields);
      // the worker may have answered it anew in the meantime
      if (!saved) throw new ConflictException("The application changed meanwhile: reload it");
      return true;
   }

   /**
    * I applied through the posting myself: on the employer's site it sends to, or on the job site.
    * Undefined when the posting is gone or never was.
    */
   async markSentByHand(userId: string, postingId: string): Promise<{ id: string } | undefined> {
      if (!(await this.db.applications.getPostingToApply(postingId))) return undefined;
      return this.db.applications.markSentByHand(userId, postingId);
   }

   /**
    * Takes back one I marked sent by hand: ready for review again when JobPilot had answered it, gone
    * otherwise. False when there is no such one.
    */
   unmarkSentByHand(userId: string, applicationId: string): Promise<boolean> {
      return this.db.applications.unmarkSentByHand(userId, applicationId);
   }

   /** A page of one of the lists; the next one starts after its last application. */
   async list(
      userId: string,
      options: Omit<ApplicationListOptions, "limit">,
   ): Promise<ApplicationListPage> {
      // one more than a page: whether another one follows
      const items = await this.db.applications.listForUser(userId, {
         ...options,
         limit: PAGE_SIZE + 1,
      });
      const page = items.slice(0, PAGE_SIZE);
      const hasMore = items.length > PAGE_SIZE;
      return { items: page, nextCursor: hasMore ? page[PAGE_SIZE - 1]!.id : null };
   }

   async get(userId: string, applicationId: string): Promise<ApplicationView | undefined> {
      const application = await this.db.applications.get(userId, applicationId);
      if (!application) return undefined;
      const [filling, preparationRunning] = await Promise.all([
         this.isFilling(applicationId),
         this.queue.isPreparing(applicationId),
      ]);
      return { ...application, filling, preparationRunning };
   }
}

/**
 * How long an application counts as open in the extension's tab without a word from it. Short: a tab
 * the extension lost (it or the browser restarted) keeps the answers locked only this long. The
 * extension still watches the tab past it, a form sent later still counts as sent.
 */
const FILLING_TTL_SECONDS = 10 * 60;

const fillingKey = (applicationId: string) => `application-filling:${applicationId}`;

/** Only answers up for review are filled in; a failed application says why, so the user knows whether preparing again can help. */
function assertReadyToFill(application: ApplicationListItem): void {
   if (application.status === "ready_for_review") return;
   const reason = application.failureReason ? `: ${application.failureReason}` : "";
   throw new ConflictException(
      `The application is ${application.status}, not ready_for_review${reason}`,
   );
}

/** The field with my answer: a choice one takes one of its options; the proposed value undoes the edit. */
function withAnswer(field: FormField, value: string): FormField {
   if (choiceFieldKinds.includes(field.kind) && field.options && !field.options.includes(value)) {
      throw new BadRequestException(`"${value}" is not one of the options of "${field.label}"`);
   }
   if (value === field.proposedValue) {
      return { ...field, finalValue: undefined, editedByUser: false };
   }
   return { ...field, finalValue: value, editedByUser: true };
}
