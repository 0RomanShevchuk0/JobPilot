import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InfraModule } from "../infra/infra.module.js";
import { SourcesController } from "./sources.controller.js";
import { SourcesService } from "./sources.service.js";

@Module({
   imports: [InfraModule, AuthModule],
   controllers: [SourcesController],
   providers: [SourcesService],
})
export class SourcesModule {}
