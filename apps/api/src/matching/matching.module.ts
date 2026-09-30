import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { MatchQueue } from "./match-queue.service.js";

@Module({
   imports: [InfraModule],
   providers: [MatchQueue],
   exports: [MatchQueue],
})
export class MatchingModule {}
