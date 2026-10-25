import { fillReportSchema, type FillReport } from "@jobpilot/contracts";
import {
   Body,
   Controller,
   Delete,
   Get,
   HttpCode,
   NotFoundException,
   Param,
   Patch,
   Post,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUserId } from "../auth/current-user-id.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { ApplicationsService } from "./applications.service.js";

const prepareBodySchema = z.object({
   /** the vacancy's posting on the job site I apply through */
   postingId: z.uuid(),
   /** read the form on the job site again; by default answering again reuses the questions read before */
   refreshForm: z.boolean().default(false),
});

const sentByHandBodySchema = z.object({
   /** the posting I applied through myself */
   postingId: z.uuid(),
});

const answersBodySchema = z.object({
   /** only the changed fields, by their name in the form */
   values: z.array(z.object({ name: z.string().min(1), value: z.string() })).min(1),
});

@Controller("applications")
export class ApplicationsController {
   constructor(private readonly applications: ApplicationsService) {}

   /**
    * Prepares an application: the worker opens the form, answers its questions and the message.
    * 202: poll GET /applications/:id until the status is ready_for_review (or failed).
    */
   @Post()
   @HttpCode(202)
   async prepare(
      @CurrentUserId() userId: string,
      @Body(new ZodValidationPipe(prepareBodySchema)) body: z.infer<typeof prepareBodySchema>,
   ) {
      return this.applications.prepare(userId, body.postingId, body.refreshForm);
   }

   /**
    * The extension starts filling the form on the job page in my browser: what to put in it. The
    * application shows as open there until the extension reports how it ended.
    */
   @Post(":id/filling")
   @HttpCode(200)
   async claimForFilling(
      @CurrentUserId() userId: string,
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
   ) {
      const form = await this.applications.claimForFilling(userId, id);
      if (!form) throw new NotFoundException("No such application");
      return form;
   }

   /** How filling the form in my browser ended, as the extension saw it: sent, closed, or a problem. */
   @Post(":id/fill-outcome")
   @HttpCode(204)
   async recordFillOutcome(
      @CurrentUserId() userId: string,
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
      @Body(new ZodValidationPipe(fillReportSchema)) report: FillReport,
   ) {
      if (!(await this.applications.recordFillOutcome(userId, id, report))) {
         throw new NotFoundException("No such application");
      }
   }

   /**
    * I applied through a posting myself (on the employer's site it sends to, or the job site): marked
    * sent, with no form. One JobPilot was preparing for it is marked sent too.
    */
   @Post("sent-by-hand")
   async markSentByHand(
      @CurrentUserId() userId: string,
      @Body(new ZodValidationPipe(sentByHandBodySchema)) body: z.infer<typeof sentByHandBodySchema>,
   ) {
      const marked = await this.applications.markSentByHand(userId, body.postingId);
      if (!marked) throw new NotFoundException("The job is no longer on this site");
      return marked;
   }

   /**
    * Takes back marking an application sent by hand: one JobPilot had answered is ready for review
    * again, with its answers; one with no form is gone. Ones JobPilot sent can't be taken back.
    */
   @Delete(":id/sent-by-hand")
   @HttpCode(204)
   async unmarkSentByHand(
      @CurrentUserId() userId: string,
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
   ) {
      if (!(await this.applications.unmarkSentByHand(userId, id))) {
         throw new NotFoundException("No application marked sent by hand with this id");
      }
   }

   /** My applications, the latest activity first. */
   @Get()
   async list(@CurrentUserId() userId: string) {
      return this.applications.list(userId);
   }

   /** Saves my own answers in place of the proposed ones, while the application is up for review. */
   @Patch(":id/fields")
   @HttpCode(204)
   async saveAnswers(
      @CurrentUserId() userId: string,
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
      @Body(new ZodValidationPipe(answersBodySchema)) body: z.infer<typeof answersBodySchema>,
   ) {
      if (!(await this.applications.saveAnswers(userId, id, body.values))) {
         throw new NotFoundException("No such application");
      }
   }

   @Get(":id")
   async get(
      @CurrentUserId() userId: string,
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
   ) {
      const application = await this.applications.get(userId, id);
      if (!application) throw new NotFoundException("No such application");
      return application;
   }
}
