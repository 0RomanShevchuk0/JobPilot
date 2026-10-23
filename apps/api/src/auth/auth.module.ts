import { Module } from "@nestjs/common";
import { InfraModule } from "../infra/infra.module.js";
import { SessionGuard } from "./session.guard.js";
import { SignInController } from "./sign-in.controller.js";
import { SignIn } from "./sign-in.service.js";

/**
 * Who the request is from: signing in with Google (SignIn, its routes under /api/auth) and the guard
 * that checks it, set on every route in main.ts. Controllers take the user with @CurrentUserId().
 */
@Module({
   imports: [InfraModule],
   controllers: [SignInController],
   providers: [SignIn, SessionGuard],
   exports: [SessionGuard],
})
export class AuthModule {}
