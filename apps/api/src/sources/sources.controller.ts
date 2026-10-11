import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.service.js";
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
}
