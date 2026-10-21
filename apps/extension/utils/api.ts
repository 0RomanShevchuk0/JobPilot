import type { ExpiredSession, FillReport, FormToFill } from "@jobpilot/contracts";

/** The API, from the monorepo's .env at build time (wxt.config.ts). */
export const API_URL = import.meta.env.API_URL;

/**
 * The sites where the server's worker found the user's session logged out, as the web's warning shows
 * them; undefined when the API isn't running, nothing is known then.
 */
export async function fetchExpiredSessions(): Promise<ExpiredSession[] | undefined> {
   try {
      const response = await fetch(`${API_URL}/sources/sessions`);
      if (!response.ok) return undefined;
      return (await response.json()) as ExpiredSession[];
   } catch {
      return undefined;
   }
}

/**
 * Starts filling an application in a tab: what to put into the form. The application shows as open in
 * the browser until reportFillOutcome. Throws with the API's reason: not ready, no CV, no such application.
 */
export async function claimFormToFill(applicationId: string): Promise<FormToFill> {
   const response = await callApi(`/applications/${applicationId}/filling`, { method: "POST" });
   return (await response.json()) as FormToFill;
}

/** How filling the application in the tab ended: sent, the tab closed, or a problem. */
export async function reportFillOutcome(applicationId: string, report: FillReport): Promise<void> {
   await callApi(`/applications/${applicationId}/fill-outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
   });
}

/** A document's file, such as the CV to attach, as the API stores it. */
export async function downloadDocument(documentId: string): Promise<Blob> {
   const response = await callApi(`/documents/${documentId}/file`);
   return response.blob();
}

/** A request to the API; throws with its reason when it refuses, or when it isn't running. */
async function callApi(path: string, init?: RequestInit): Promise<Response> {
   let response: Response;
   try {
      response = await fetch(`${API_URL}${path}`, init);
   } catch {
      throw new Error("API is not running");
   }
   if (response.ok) return response;
   const body = (await response.json().catch(() => undefined)) as { message?: unknown } | undefined;
   const reason = typeof body?.message === "string" ? body.message : `HTTP ${response.status}`;
   throw new Error(`API: ${reason}`);
}
