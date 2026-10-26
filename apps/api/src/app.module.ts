import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApplicationsModule } from "./applications/applications.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DebugController } from "./debug/debug.controller.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { HealthController } from "./health/health.controller.js";
import { InfraModule } from "./infra/infra.module.js";
import { ProfileModule } from "./profile/profile.module.js";
import { SourcesModule } from "./sources/sources.module.js";
import { StatsModule } from "./stats/stats.module.js";

@Module({
   imports: [
      // .env lives at the monorepo root; scripts run with apps/api as cwd
      ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
      InfraModule,
      AuthModule,
      ProfileModule,
      SourcesModule,
      DocumentsModule,
      ApplicationsModule,
      StatsModule,
   ],
   controllers: [HealthController, DebugController],
})
export class AppModule {}
