import { type Profile, profileSchema } from "@jobpilot/contracts";
import { Body, Controller, Get, NotFoundException, Put } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { CurrentUser } from "../auth/current-user.service.js";
import { ProfileService } from "./profile.service.js";

@Controller("profile")
export class ProfileController {
   constructor(
      private readonly profiles: ProfileService,
      private readonly user: CurrentUser,
   ) {}

   @Get()
   async get() {
      const userId = await this.user.id();
      const stored = await this.profiles.get(userId);
      if (!stored) throw new NotFoundException("No profile yet: create it with PUT /profile");
      return stored;
   }

   @Put()
   async put(@Body(new ZodValidationPipe(profileSchema)) profile: Profile) {
      const userId = await this.user.id();
      return this.profiles.save(userId, profile);
   }
}
