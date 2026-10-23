import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { MatchingModule } from "../matching/matching.module.js";
import { ProfileController } from "./profile.controller.js";
import { ProfileService } from "./profile.service.js";

@Module({
   imports: [InfraModule, MatchingModule],
   controllers: [ProfileController],
   providers: [ProfileService],
})
export class ProfileModule {}
