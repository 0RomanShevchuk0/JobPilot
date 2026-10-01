import { Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.service.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { MatchesService } from "./matches.service.js";

const listQuerySchema = z.object({
   /** "skipped" adds AI skips, prefilter rejections and vacancies still waiting for a score */
   include: z.literal("skipped").optional(),
});

@Controller("matches")
export class MatchesController {
   constructor(
      private readonly matches: MatchesService,
      private readonly user: CurrentUser,
   ) {}

   /** Vacancies worth a look for my current profile, best first. */
   @Get()
   async list(
      @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
   ) {
      const userId = await this.user.id();
      return this.matches.list(userId, { includeSkipped: query.include === "skipped" });
   }
}
