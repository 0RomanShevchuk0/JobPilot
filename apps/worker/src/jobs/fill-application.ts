import type { FillApplicationJobData } from "@jobpilot/contracts";
import {
   DjinniSessionExpiredError,
   fillDjinniApplication,
   openDjinniContext,
} from "@jobpilot/apply";
import type { DatabaseClient } from "@jobpilot/db";
import type { FileStorage } from "@jobpilot/storage";
import type { Job } from "bullmq";
import { chromium } from "playwright";
import { config } from "../config.js";
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
   storage: FileStorage,
) {
   const { applicationId } = job.data;
   const application = await database.applications.getToFill(applicationId);
   if (!application || application.status !== "ready_for_review") return "not ready";

   const values = application.fields.map((f) => ({
      name: f.name,
      value: f.finalValue ?? f.proposedValue ?? "",
   }));

   const browser = await chromium.launch({ headless: false, slowMo: SLOW_MO_MS });
   try {
      const context = await openDjinniContext(browser, config.djinniSessionPath);
      const outcome = await fillDjinniApplication(context, application.postingUrl, values);
      if (outcome.status === "cancelled") {
         log("fill-application", `${application.postingUrl}: closed without sending`);
         return "cancelled";
      }
      await database.applications.setSubmitted(applicationId);
      if (outcome.screenshot) {
         const key = `users/${application.userId}/applications/${applicationId}/sent.png`;
         await storage.put(key, outcome.screenshot, "image/png");
      }
      log("fill-application", `${application.postingUrl}: sent`);
      return "submitted";
   } catch (err) {
      const reason =
         err instanceof DjinniSessionExpiredError
            ? "Not logged in to Djinni: run `pnpm djinni:login` in apps/worker, then fill again"
            : (err as Error).message;
      await database.applications.setFillProblem(applicationId, reason);
      throw err;
   } finally {
      await browser.close();
   }
}
