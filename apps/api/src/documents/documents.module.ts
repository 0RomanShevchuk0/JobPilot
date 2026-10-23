import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { MatchingModule } from "../matching/matching.module.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({
   imports: [InfraModule, MatchingModule],
   controllers: [DocumentsController],
   providers: [DocumentsService],
})
export class DocumentsModule {}
