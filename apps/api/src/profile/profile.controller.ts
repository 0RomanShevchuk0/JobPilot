import { type Profile, profileSchema } from "@jobpilot/contracts";
import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { CurrentUserId } from "../auth/current-user-id.decorator.js";
import { ProfileService } from "./profile.service.js";

@Controller("profile")
export class ProfileController {
   constructor(private readonly profiles: ProfileService) {}

   /** No body when there is no profile yet: a new user's normal state, not an error. */
   @Get()
   async get(@CurrentUserId() userId: string) {
      return this.profiles.get(userId);
   }

   @Put()
   async put(
      @CurrentUserId() userId: string,
      @Body(new ZodValidationPipe(profileSchema)) profile: Profile,
   ) {
      return this.profiles.save(userId, profile);
   }

   /** Fields read from the CV for the form to fill in; saves nothing. */
   @Post("from-cv")
   async fromCv(@CurrentUserId() userId: string) {
      return this.profiles.fromCv(userId);
   }
}
