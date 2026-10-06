import {
   choiceFieldKinds,
   SourceIds,
   type ApplicationListItem,
   type ApplicationView,
   type FormField,
} from "@jobpilot/contracts";
import {
   BadRequestException,
   ConflictException,
   Injectable,
   NotFoundException,
} from "@nestjs/common";
import { Database } from "../infra/database.js";
import { ApplicationQueue } from "./application-queue.service.js";

// job sites the browser agent can apply on
const APPLY_SOURCES = [SourceIds.djinni];

@Injectable()
export class ApplicationsService {
   constructor(
      private readonly db: Database,
      private readonly queue: ApplicationQueue,
   ) {}

   /**
    * Starts preparing an application to a vacancy: the worker reads the form and answers it.
    * Preparing the same vacancy again answers the same questions anew, without opening the job site;
    * refreshForm reads the form again first.
    */
   async prepare(userId: string, vacancyId: string, refreshForm: boolean): Promise<{ id: string }> {
      const posting = await this.db.applications.findPostingToApply(vacancyId, APPLY_SOURCES);
      if (!posting) throw new NotFoundException("No open Djinni posting for this vacancy");
      const application = await this.db.applications.startPreparing(userId, posting.id);
      if (!application) throw new ConflictException("Already applied to this vacancy");
      await this.queue.prepare(application.id, refreshForm);
      return application;
   }

   /**
    * Opens the prepared application in a visible browser on this machine, filled in: the user reviews it
    * there and sends it themselves. Returns false when there is no such application.
    */
   async fill(userId: string, applicationId: string): Promise<boolean> {
      const application = await this.db.applications.get(userId, applicationId);
      if (!application) return false;
      if (application.status !== "ready_for_review") {
         // a failed one says why, so the user knows whether preparing again can help
         const reason = application.failureReason ? `: ${application.failureReason}` : "";
         throw new ConflictException(
            `The application is ${application.status}, not ready_for_review${reason}`,
         );
      }
      await this.queue.fill(applicationId);
      return true;
   }

   /**
    * Saves my own answers in place of the proposed ones, by field name: only while the answers are up
    * for review and not open in a browser window. A value equal to the proposed one undoes the edit.
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
      if (await this.queue.isFilling(applicationId)) {
         throw new ConflictException(
            "The form is open in a browser window: close it, then change the answers",
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

   list(userId: string): Promise<ApplicationListItem[]> {
      return this.db.applications.listForUser(userId);
   }

   async get(userId: string, applicationId: string): Promise<ApplicationView | undefined> {
      const application = await this.db.applications.get(userId, applicationId);
      return application && { ...application, filling: await this.queue.isFilling(applicationId) };
   }
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
