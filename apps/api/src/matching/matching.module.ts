import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { MatchQueue } from "./match-queue.service.js";
import { MatchesController } from "./matches.controller.js";
import { MatchesService } from "./matches.service.js";

@Module({
   imports: [InfraModule],
   controllers: [MatchesController],
   providers: [MatchQueue, MatchesService],
   exports: [MatchQueue],
})
export class MatchingModule {}
