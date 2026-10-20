import { siteSessionSchema, type SiteSession } from "@jobpilot/contracts";
import { Body, Controller, Get, HttpCode, Param, Put } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.service.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { SourcesService } from "./sources.service.js";

@Controller("sources")
export class SourcesController {
   constructor(
      private readonly sources: SourcesService,
      private readonly user: CurrentUser,
   ) {}

   /** The job sites where my session stopped working: the worker can't check them for me. */
   @Get("sessions")
   async expiredSessions() {
      const userId = await this.user.id();
      return this.sources.expiredSessions(userId);
   }

   /**
    * My session on a job site, as the extension reads it from my browser: replaces the one saved before.
    * An unknown source is refused by the database (source_sessions references sources).
    */
   @Put(":source/session")
   @HttpCode(204)
   async saveSession(
      @Param("source") source: string,
      @Body(new ZodValidationPipe(siteSessionSchema)) session: SiteSession,
   ) {
      const userId = await this.user.id();
      await this.sources.saveSession(userId, source, session);
   }
}
