import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { JobAttemptsController } from "./job-attempts.controller.js";
import { JobAttemptsService } from "./job-attempts.service.js";

@Module({
   imports: [InfraModule],
   controllers: [JobAttemptsController],
   providers: [JobAttemptsService],
})
export class JobAttemptsModule {}
