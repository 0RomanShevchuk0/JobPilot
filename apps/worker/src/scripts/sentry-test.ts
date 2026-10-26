// Sends one test error to Sentry to confirm reporting works in this environment, then exits. Run it in
// the prod container to check prod end to end (env has the DSN, the server can reach Sentry):
//   docker compose -f docker-compose.prod.yml exec worker node dist/scripts/sentry-test.js
import { sentry } from "@jobpilot/observability";

const enabled = sentry.init();
console.log(
   `Sentry ${enabled ? "enabled" : "off (no SENTRY_DSN)"}, environment ${process.env.NODE_ENV ?? "development"}`,
);
if (enabled) {
   sentry.reportError(new Error("JobPilot Sentry test — safe to ignore"), {
      tags: { service: "sentry-test" },
   });
   await sentry.close(5000);
   console.log("test error sent — check Sentry → Issues");
}
