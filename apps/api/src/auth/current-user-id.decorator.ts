import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { SignedInRequest } from "./session.guard.js";

/** The signed-in user's id, as SessionGuard found it for the request. */
export const CurrentUserId = createParamDecorator(
   (_data: unknown, context: ExecutionContext): string =>
      context.switchToHttp().getRequest<SignedInRequest>().userId,
);
