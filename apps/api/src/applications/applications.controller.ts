import { fillReportSchema, type FillReport } from "@jobpilot/contracts";
import {
   Body,
   Controller,
   Get,
   HttpCode,
   NotFoundException,
   Param,
   Patch,
   Post,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.service.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { ApplicationsService } from "./applications.service.js";

const prepareBodySchema = z.object({
   /** the vacancy's posting on the job site I apply through */
   postingId: z.uuid(),
   /** read the form on the job site again; by default answering again reuses the questions read before */
   refreshForm: z.boolean().default(false),
});

const answersBodySchema = z.object({
   /** only the changed fields, by their name in the form */
   values: z.array(z.object({ name: z.string().min(1), value: z.string() })).min(1),
});

@Controller("applications")
export class ApplicationsController {
   constructor(
      private readonly applications: ApplicationsService,
      private readonly user: CurrentUser,
   ) {}

   /**
    * Prepares an application: the worker opens the form, answers its questions and the message.
    * 202: poll GET /applications/:id until the status is ready_for_review (or failed).
    */
   @Post()
   @HttpCode(202)
   async prepare(
      @Body(new ZodValidationPipe(prepareBodySchema)) body: z.infer<typeof prepareBodySchema>,
   ) {
      const userId = await this.user.id();
      return this.applications.prepare(userId, body.postingId, body.refreshForm);
   }

   /** Fills the prepared answers into the form in a visible browser; you send it (or close the window). */
   @Post(":id/fill")
   @HttpCode(202)
   async fill(@Param("id", new ZodValidationPipe(z.uuid())) id: string) {
      const userId = await this.user.id();
      if (!(await this.applications.fill(userId, id))) {
         throw new NotFoundException("No such application");
      }
   }

   /**
    * The extension starts filling the form on the job page in my browser: what to put in it. The
    * application shows as open there until the extension reports how it ended.
    */
   @Post(":id/filling")
   @HttpCode(200)
   async startFilling(@Param("id", new ZodValidationPipe(z.uuid())) id: string) {
      const userId = await this.user.id();
      const form = await this.applications.startFilling(userId, id);
      if (!form) throw new NotFoundException("No such application");
      return form;
   }

   /** How filling the form in my browser ended, as the extension saw it: sent, closed, or a problem. */
   @Post(":id/fill-outcome")
   @HttpCode(204)
   async reportFilling(
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
      @Body(new ZodValidationPipe(fillReportSchema)) report: FillReport,
   ) {
      const userId = await this.user.id();
      if (!(await this.applications.reportFilling(userId, id, report))) {
         throw new NotFoundException("No such application");
      }
   }

   /** My applications, the latest activity first. */
   @Get()
   async list() {
      const userId = await this.user.id();
      return this.applications.list(userId);
   }

   /** Saves my own answers in place of the proposed ones, while the application is up for review. */
   @Patch(":id/fields")
   @HttpCode(204)
   async saveAnswers(
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
      @Body(new ZodValidationPipe(answersBodySchema)) body: z.infer<typeof answersBodySchema>,
   ) {
      const userId = await this.user.id();
      if (!(await this.applications.saveAnswers(userId, id, body.values))) {
         throw new NotFoundException("No such application");
      }
   }

   @Get(":id")
   async get(@Param("id", new ZodValidationPipe(z.uuid())) id: string) {
      const userId = await this.user.id();
      const application = await this.applications.get(userId, id);
      if (!application) throw new NotFoundException("No such application");
      return application;
   }
}
