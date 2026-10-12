import { type Profile, profileSchema } from "@jobpilot/contracts";
import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { CurrentUser } from "../auth/current-user.service.js";
import { ProfileService } from "./profile.service.js";

@Controller("profile")
export class ProfileController {
   constructor(
      private readonly profiles: ProfileService,
      private readonly user: CurrentUser,
   ) {}

   /** No body when there is no profile yet: a new user's normal state, not an error. */
   @Get()
   async get() {
      const userId = await this.user.id();
      return this.profiles.get(userId);
   }

   @Put()
   async put(@Body(new ZodValidationPipe(profileSchema)) profile: Profile) {
      const userId = await this.user.id();
      return this.profiles.save(userId, profile);
   }

   /** Fields read from the CV for the form to fill in; saves nothing. */
   @Post("from-cv")
   async fromCv() {
      const userId = await this.user.id();
      return this.profiles.fromCv(userId);
   }
}
