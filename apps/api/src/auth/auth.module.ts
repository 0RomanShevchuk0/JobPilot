import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { CurrentUser } from "./current-user.service.js";

/**
 * Who the request is from. Single-user stub for now (see CurrentUser); with real auth this becomes
 * a guard plus a @CurrentUser() parameter decorator.
 */
@Module({
   imports: [InfraModule],
   providers: [CurrentUser],
   exports: [CurrentUser],
})
export class AuthModule {}
