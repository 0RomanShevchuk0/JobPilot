import type { FillReport, FormToFill } from "@jobpilot/contracts";
import { api } from "../../shared/api.js";

/** The API's side of filling applications in. */
export const applicationsApi = {
   /**
    * Claims an application for filling in a tab: what to put into the form. The application shows as
    * open in the browser until reportFillOutcome. Throws with the API's reason: not ready, no CV, no
    * such application.
    */
   async claimFormToFill(applicationId: string): Promise<FormToFill> {
      const response = await api.call(`/applications/${applicationId}/filling`, { method: "POST" });
      return (await response.json()) as FormToFill;
   },

   /** How filling the application in the tab ended: sent, the tab closed, or a problem. */
   async reportFillOutcome(applicationId: string, report: FillReport): Promise<void> {
      await api.call(`/applications/${applicationId}/fill-outcome`, {
         method: "POST",
         ...api.jsonBody(report),
      });
   },

   /** A document's file, such as the CV to attach, as the API stores it. */
   async downloadDocument(documentId: string): Promise<Blob> {
      const response = await api.call(`/documents/${documentId}/file`);
      return response.blob();
   },
};
