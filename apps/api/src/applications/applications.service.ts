import type { ApplicationView } from "@jobpilot/contracts";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Database } from "../infra/database.js";
import { ApplicationQueue } from "./application-queue.service.js";

// job sites the browser agent can apply on
const APPLY_SOURCES = ["djinni"];

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
      const postingId = await this.db.applications.findPostingToApply(vacancyId, APPLY_SOURCES);
      if (!postingId) throw new NotFoundException("No open Djinni posting for this vacancy");
      const application = await this.db.applications.startPreparing(userId, postingId);
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

   get(userId: string, applicationId: string): Promise<ApplicationView | undefined> {
      return this.db.applications.get(userId, applicationId);
   }
}
