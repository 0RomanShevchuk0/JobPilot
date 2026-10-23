import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { SourcesController } from "./sources.controller.js";
import { SourcesService } from "./sources.service.js";

@Module({
   imports: [InfraModule],
   controllers: [SourcesController],
   providers: [SourcesService],
})
export class SourcesModule {}
