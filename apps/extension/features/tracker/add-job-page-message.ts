import type { AddJobPage } from "@jobpilot/contracts";

/** The popup's ask to the background: add the job page it read to the tracker. */
export interface AddJobPageMessage {
   type: "add-job-page";
   page: AddJobPage;
}

export function addJobPageMessage(page: AddJobPage): AddJobPageMessage {
   return { type: "add-job-page", page };
}

export function isAddJobPageMessage(message: unknown): message is AddJobPageMessage {
   return (
      typeof message === "object" &&
      message !== null &&
      (message as { type?: unknown }).type === "add-job-page"
   );
}
