import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InfraModule } from "../infra/infra.module.js";
import { ApplicationQueue } from "./application-queue.service.js";
import { ApplicationsController } from "./applications.controller.js";
import { ApplicationsService } from "./applications.service.js";

@Module({
   imports: [InfraModule, AuthModule],
   controllers: [ApplicationsController],
   providers: [ApplicationsService, ApplicationQueue],
})
export class ApplicationsModule {}
