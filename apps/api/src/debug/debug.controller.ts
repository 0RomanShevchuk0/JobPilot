import { Controller, Get } from "@nestjs/common";

/**
 * TEMPORARY — verifying Sentry in prod. GET /api/debug/error throws an unhandled error, so
 * SentryExceptionFilter reports it (with the caller's userId, as the global guard runs first). Remove
 * this controller once an issue shows up in Sentry: revert the commit that added it.
 */
@Controller("debug")
export class DebugController {
   @Get("error")
   error(): never {
      throw new Error("Deliberate test error to verify Sentry reporting");
   }
}
