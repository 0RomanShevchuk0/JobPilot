import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InfraModule } from "../infra/infra.module.js";
import { MatchingModule } from "../matching/matching.module.js";
import { ProfileController } from "./profile.controller.js";
import { ProfileService } from "./profile.service.js";

@Module({
   imports: [InfraModule, AuthModule, MatchingModule],
   controllers: [ProfileController],
   providers: [ProfileService],
})
export class ProfileModule {}
