import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DocumentsModule } from "./documents/documents.module.js";
import { HealthController } from "./health/health.controller.js";
import { InfraModule } from "./infra/infra.module.js";
import { ProfileModule } from "./profile/profile.module.js";

@Module({
   imports: [
      // .env lives at the monorepo root; scripts run with apps/api as cwd
      ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
      InfraModule,
      ProfileModule,
      DocumentsModule,
   ],
   controllers: [HealthController],
})
export class AppModule {}
