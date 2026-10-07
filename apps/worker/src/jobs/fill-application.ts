import { SessionExpiredError, type FillApplicationJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { type Job, UnrecoverableError } from "bullmq";
import { sessionPath } from "../config.js";
import { log } from "../log.js";
import { findSource } from "../sources.js";

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
   const entry = findSource(application.source);
   if (!entry) {
      const reason = `No adapter for source ${application.source}`;
      await database.applications.setFillProblem(applicationId, reason);
      throw new UnrecoverableError(reason);
   }

   const values = application.fields.map((f) => ({
      name: f.name,
      kind: f.kind,
      value: f.finalValue ?? f.proposedValue ?? "",
   }));

   try {
      const outcome = await entry.adapter.account.fillApplicationForm(
         application.postingUrl,
         sessionPath(application.source),
         values,
      );
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
   }
}
