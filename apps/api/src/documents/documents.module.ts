import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InfraModule } from "../infra/infra.module.js";
import { MatchingModule } from "../matching/matching.module.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({
   imports: [InfraModule, AuthModule, MatchingModule],
   controllers: [DocumentsController],
   providers: [DocumentsService],
})
export class DocumentsModule {}
