import { All, Controller, Req, Res } from "@nestjs/common";
import { toNodeHandler } from "better-auth/node";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Public } from "./public.decorator.js";
import { SignIn } from "./sign-in.service.js";

/**
 * Signing in with Google, under /api/auth: Better Auth answers every route there itself (starting the
 * sign-in, Google's callback, the session, signing out). Its Node handler takes the request as Nest got
 * it: the body Nest has parsed already it writes back as it came (JSON or a form).
 */
@Public()
@Controller("auth")
export class SignInController {
   private readonly answerSignIn: ReturnType<typeof toNodeHandler>;

   constructor(signIn: SignIn) {
      this.answerSignIn = toNodeHandler(signIn.auth);
   }

   @All("*splat")
   handle(@Req() req: IncomingMessage, @Res() res: ServerResponse): Promise<void> {
      return this.answerSignIn(req, res);
   }
}
