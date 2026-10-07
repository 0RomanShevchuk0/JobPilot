import { SessionExpiredError, SourceIds, type FillApplicationJobData } from "@jobpilot/contracts";
import { fillDjinniApplication, launchBrowser, openDjinniContext } from "@jobpilot/sources";
import type { DatabaseClient } from "@jobpilot/db";
import { type Job, UnrecoverableError } from "bullmq";
import { sessionPath } from "../config.js";
import { log } from "../log.js";

// slows every browser action down a little, so the user can follow the filling
const SLOW_MO_MS = 150;

/**
 * The user approved the answers: open the form in a visible browser on this machine, fill them in and
 * leave it to the user, who sends it or closes the window. Nothing is ever sent by the worker itself.
 */
export async function handleFillApplication(
   job: Job<FillApplicationJobData>,
   database: DatabaseClient,
) {
   const { applicationId } = job.data;
   const application = await database.applications.getToFill(applicationId);
   if (!application || application.status !== "ready_for_review") return "not ready";
   if (application.source !== SourceIds.djinni) {
      const reason = `Applying through ${application.source} is not supported yet`;
      await database.applications.setFillProblem(applicationId, reason);
      throw new UnrecoverableError(reason);
   }

   const values = application.fields.map((f) => ({
      name: f.name,
      kind: f.kind,
      value: f.finalValue ?? f.proposedValue ?? "",
   }));

   const browser = await launchBrowser({ visible: true, slowMo: SLOW_MO_MS });
   try {
      const context = await openDjinniContext(browser, sessionPath(SourceIds.djinni));
      const outcome = await fillDjinniApplication(context, application.postingUrl, values);
      if (outcome.status === "cancelled") {
         log("fill-application", `${application.postingUrl}: closed without sending`);
         return "cancelled";
      }
      await database.applications.setSubmitted(applicationId);
      // the vacancy moves to Applied in Matches, as if the user had marked it there
      if (application.vacancyId) {
         await database.matches.setStatus(application.userId, application.vacancyId, "applied");
      }
      log("fill-application", `${application.postingUrl}: sent`);
      return "submitted";
   } catch (err) {
      const reason =
         err instanceof SessionExpiredError
            ? `${err.message}, then fill again`
            : (err as Error).message;
      await database.applications.setFillProblem(applicationId, reason);
      throw err;
   } finally {
      await browser.close();
   }
}
