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
   vacancyId: z.uuid(),
   /** read the form on Djinni again; by default answering again reuses the questions read before */
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
      return this.applications.prepare(userId, body.vacancyId, body.refreshForm);
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
