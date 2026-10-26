import * as Sentry from "@sentry/node";

/** Context attached to a reported error: searchable tags, extra data shown on the event, and who hit it. */
export interface ErrorContext {
   tags?: Record<string, string>;
   extra?: Record<string, unknown>;
   user?: { id?: string; email?: string };
}

let enabled = false;

/** Error reporting through Sentry: one thing to import, the app's error monitoring in a few calls. */
export const sentry = {
   /**
    * Starts reporting when SENTRY_DSN is set; a no-op otherwise (dev, or not configured), so the app
    * runs the same without it. Errors only: no performance tracing or profiling. environment and release
    * (both from the env) group events in Sentry. Call once, before the app does its work.
    */
   init(): boolean {
      const dsn = process.env.SENTRY_DSN;
      if (!dsn) return false;
      Sentry.init({
         dsn,
         environment: process.env.NODE_ENV ?? "development",
         release: process.env.SENTRY_RELEASE || undefined,
         // errors only: no transactions sampled, and no trace headers added to outgoing requests
         tracesSampleRate: 0,
         tracePropagationTargets: [],
      });
      enabled = true;
      return true;
   },

   /** Reports an error to Sentry with optional context; a no-op when Sentry isn't configured. */
   reportError(error: unknown, context?: ErrorContext): void {
      if (!enabled) return;
      Sentry.captureException(error, context);
   },

   /**
    * Flushes buffered events so they aren't lost when the process exits; safe to call (and quick to
    * return) when Sentry isn't configured.
    */
   async close(timeoutMs = 2000): Promise<void> {
      if (!enabled) return;
      await Sentry.close(timeoutMs);
   },
};
