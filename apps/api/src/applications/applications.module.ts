import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { ApplicationQueue } from "./application-queue.service.js";
import { ApplicationsController } from "./applications.controller.js";
import { ApplicationsService } from "./applications.service.js";

@Module({
   imports: [InfraModule],
   controllers: [ApplicationsController],
   providers: [ApplicationsService, ApplicationQueue],
})
export class ApplicationsModule {}
