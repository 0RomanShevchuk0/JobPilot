import {
   jobAttemptChangesSchema,
   newJobAttemptSchema,
   type JobAttemptChanges,
   type NewJobAttempt,
} from "@jobpilot/contracts";
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
   Query,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUserId } from "../auth/current-user-id.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { JobAttemptsService } from "./job-attempts.service.js";

const listQuerySchema = z.object({
   /** the nextCursor of the previous page; absent = the first page */
   after: z.uuid().optional(),
});

@Controller("job-attempts")
export class JobAttemptsController {
   constructor(private readonly jobAttempts: JobAttemptsService) {}

   /** My tracker, a page at a time, the latest applied first. */
   @Get()
   list(
      @CurrentUserId() userId: string,
      @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
   ) {
      return this.jobAttempts.list(userId, query.after);
   }

   /** Adds a job JobPilot doesn't know about: LinkedIn, a referral, a company's site. */
   @Post()
   create(
      @CurrentUserId() userId: string,
      @Body(new ZodValidationPipe(newJobAttemptSchema)) attempt: NewJobAttempt,
   ) {
      return this.jobAttempts.create(userId, attempt);
   }

   /** Changes a row's stage, status or notes, or names its company when it has none. */
   @Patch(":id")
   @HttpCode(204)
   async update(
      @CurrentUserId() userId: string,
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
      @Body(new ZodValidationPipe(jobAttemptChangesSchema)) changes: JobAttemptChanges,
   ) {
      if (!(await this.jobAttempts.update(userId, id, changes))) {
         throw new NotFoundException("No such row in the tracker");
      }
   }

   /** Removes a row; its applications stay sent. */
   @Delete(":id")
   @HttpCode(204)
   async delete(
      @CurrentUserId() userId: string,
      @Param("id", new ZodValidationPipe(z.uuid())) id: string,
   ) {
      if (!(await this.jobAttempts.delete(userId, id))) {
         throw new NotFoundException("No such row in the tracker");
      }
   }
}
