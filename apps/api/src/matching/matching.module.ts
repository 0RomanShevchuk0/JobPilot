import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InfraModule } from "../infra/infra.module.js";
import { MatchQueue } from "./match-queue.service.js";
import { MatchesController } from "./matches.controller.js";
import { MatchesService } from "./matches.service.js";

@Module({
   imports: [InfraModule, AuthModule],
   controllers: [MatchesController],
   providers: [MatchQueue, MatchesService],
   exports: [MatchQueue],
})
export class MatchingModule {}
