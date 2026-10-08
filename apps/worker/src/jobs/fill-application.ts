import {
   SessionExpiredError,
   type FillApplicationJobData,
   type FillValue,
} from "@jobpilot/contracts";
import type { ApplicationToFill, DatabaseClient } from "@jobpilot/db";
import type { FileStorage } from "@jobpilot/storage";
import { type Job, UnrecoverableError } from "bullmq";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { loginHint, sessionPath } from "../config.js";
import { log } from "../log.js";
import { findSource } from "../sources.js";

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
   const entry = findSource(application.source);
   if (!entry) {
      const reason = `No adapter for source ${application.source}`;
      await database.applications.setFillProblem(applicationId, reason);
      throw new UnrecoverableError(reason);
   }

   // where the CV is downloaded to, for the form to attach; removed whatever happens
   const cvDir = await mkdtemp(join(tmpdir(), "jobpilot-cv-"));
   try {
      const values = await fillValues(application, database, storage, cvDir);
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
            ? `${err.message}: ${loginHint(application.source)}, then fill again`
            : (err as Error).message;
      await database.applications.setFillProblem(applicationId, reason);
      throw err;
   } finally {
      await rm(cvDir, { recursive: true, force: true });
   }
}

/** The answers to put into the form; the CV field gets the base CV, downloaded into cvDir. */
function fillValues(
   application: ApplicationToFill,
   database: DatabaseClient,
   storage: FileStorage,
   cvDir: string,
): Promise<FillValue[]> {
   const values = application.fields.map(async (f) => ({
      name: f.name,
      kind: f.kind,
      value:
         f.valueSource === "document"
            ? await downloadBaseCv(application.userId, database, storage, cvDir)
            : (f.finalValue ?? f.proposedValue ?? ""),
   }));
   return Promise.all(values);
}

/**
 * The user's base CV as it is now, saved into dir under its own name: the site shows the name to the
 * recruiter. Returns the file's path.
 */
async function downloadBaseCv(
   userId: string,
   database: DatabaseClient,
   storage: FileStorage,
   dir: string,
): Promise<string> {
   const info = await database.documents.getBaseCvFileInfo(userId);
   if (!info) throw new Error("No CV to attach: upload yours in Documents, then fill again");
   const file = await storage.get(info.filePath);
   if (!file)
      throw new Error("The CV file is missing: upload it again in Documents, then fill again");
   // the name came with the upload: only its last part, so it can't point outside dir
   const path = join(dir, basename(info.fileName));
   await writeFile(path, file.body);
   return path;
}
