import { siteSessionSchema, type SiteSession } from "@jobpilot/contracts";
import { Body, Controller, Get, HttpCode, Param, Put } from "@nestjs/common";
import { CurrentUserId } from "../auth/current-user-id.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { SourcesService } from "./sources.service.js";

@Controller("sources")
export class SourcesController {
   constructor(private readonly sources: SourcesService) {}

   /** The job sites where my session stopped working: the worker can't check them for me. */
   @Get("sessions")
   async expiredSessions(@CurrentUserId() userId: string) {
      return this.sources.expiredSessions(userId);
   }

   /**
    * My session on a job site, as the extension reads it from my browser: replaces the one saved before.
    * An unknown source is refused by the database (source_sessions references sources).
    */
   @Put(":source/session")
   @HttpCode(204)
   async saveSession(
      @CurrentUserId() userId: string,
      @Param("source") source: string,
      @Body(new ZodValidationPipe(siteSessionSchema)) session: SiteSession,
   ) {
      await this.sources.saveSession(userId, source, session);
   }
}
