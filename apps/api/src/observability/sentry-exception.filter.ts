import { sentry } from "@jobpilot/observability";
import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import type { SignedInRequest } from "../auth/session.guard.js";

/**
 * Reports unhandled failures to Sentry, then answers as Nest normally would (BaseExceptionFilter).
 * Expected HttpExceptions under 500 (404, 401, 400, …) are normal API answers, not incidents, so they're
 * left out; a thrown 500 or any non-HttpException is reported with the request's method, path and user.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
   constructor(adapterHost: HttpAdapterHost) {
      super(adapterHost.httpAdapter);
   }

   catch(exception: unknown, host: ArgumentsHost): void {
      const expected = exception instanceof HttpException && exception.getStatus() < 500;
      if (!expected) {
         const request = host.switchToHttp().getRequest<SignedInRequest>();
         sentry.reportError(exception, {
            tags: { method: request.method ?? "", path: request.url ?? "" },
            user: request.userId ? { id: request.userId } : undefined,
         });
      }
      super.catch(exception, host);
   }
}
