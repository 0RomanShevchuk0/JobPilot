import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { StatsController } from "./stats.controller.js";
import { StatsService } from "./stats.service.js";

@Module({
   imports: [InfraModule],
   controllers: [StatsController],
   providers: [StatsService],
})
export class StatsModule {}
