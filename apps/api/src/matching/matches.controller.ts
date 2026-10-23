import { matchStatusSchema } from "@jobpilot/contracts";
import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUserId } from "../auth/current-user-id.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { MatchesService } from "./matches.service.js";

const listQuerySchema = z.object({
   /** which vacancies: new (not marked yet, the default) or hidden; the applied ones: GET /matches/applied */
   status: z.enum(["new", "hidden"]).default("new"),
   /** new vacancies only: "skipped" adds AI skips, prefilter rejections and the ones waiting for a score */
   include: z.literal("skipped").optional(),
   /** the nextCursor of the previous page; absent = the first page */
   after: z.uuid().optional(),
});

const statusBodySchema = z.object({
   /** null clears the mark: the vacancy is new again */
   status: matchStatusSchema,
});

@Controller("matches")
export class MatchesController {
   constructor(private readonly matches: MatchesService) {}

   /**
    * Vacancies evaluated for my current profile, a page at a time: the new ones best first, the hidden
    * ones the latest hidden first.
    */
   @Get()
   async list(
      @CurrentUserId() userId: string,
      @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
   ) {
      return this.matches.list(userId, {
         status: query.status === "new" ? null : query.status,
         includeSkipped: query.include === "skipped",
         after: query.after,
      });
   }

   /** Everything I applied to, through JobPilot or on my own, the latest first: the history. */
   // before :vacancyId, which would take "applied" for an id
   @Get("applied")
   async listApplied(@CurrentUserId() userId: string) {
      return this.matches.listApplied(userId);
   }

   /** One vacancy as evaluated for my current profile, with its description and every job site it is on. */
   @Get(":vacancyId")
   async get(
      @CurrentUserId() userId: string,
      @Param("vacancyId", new ZodValidationPipe(z.uuid())) vacancyId: string,
   ) {
      const match = await this.matches.get(userId, vacancyId);
      if (!match) throw new NotFoundException("No evaluated vacancy with this id");
      return match;
   }

   /** Marks a vacancy as applied or hidden, or clears the mark. */
   @Patch(":vacancyId")
   async setStatus(
      @CurrentUserId() userId: string,
      @Param("vacancyId", new ZodValidationPipe(z.uuid())) vacancyId: string,
      @Body(new ZodValidationPipe(statusBodySchema)) body: z.infer<typeof statusBodySchema>,
   ) {
      const found = await this.matches.setStatus(userId, vacancyId, body.status);
      if (!found) throw new NotFoundException("No evaluated vacancy with this id");
      return { vacancyId, status: body.status };
   }
}
