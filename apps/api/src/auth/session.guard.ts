import {
   type CanActivate,
   type ExecutionContext,
   Injectable,
   UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { IncomingMessage } from "node:http";
import { IS_PUBLIC } from "./public.decorator.js";
import { SignIn } from "./sign-in.service.js";

/** A request a signed-in user sent: whose it is, for @CurrentUserId(). */
export interface SignedInRequest extends IncomingMessage {
   userId: string;
}

/**
 * Every route takes a signed-in user unless marked @Public(): 401 without a session. Global, so a new
 * controller can't be left open by forgetting it.
 */
@Injectable()
export class SessionGuard implements CanActivate {
   constructor(
      private readonly signIn: SignIn,
      private readonly reflector: Reflector,
   ) {}

   async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
         context.getHandler(),
         context.getClass(),
      ]);
      if (isPublic) return true;

      const request = context.switchToHttp().getRequest<SignedInRequest>();
      const userId = await this.signIn.userIdOf(request.headers);
      if (!userId) throw new UnauthorizedException("Sign in first");
      request.userId = userId;
      return true;
   }
}
