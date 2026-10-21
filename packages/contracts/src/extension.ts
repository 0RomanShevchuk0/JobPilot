/*
 * What the web app and the JobPilot extension say to each other (chrome.runtime.sendMessage; the
 * extension's externally_connectable lets only the web app's origin in).
 */

/** Asks whether the extension is there: it answers { ok: true }. */
export const EXTENSION_PING = "ping";

/** Opens the application's job page in a tab and fills its form in there, for the user to send. */
export interface ExtensionFillCommand {
   /** the application to fill in */
   fill: string;
}

/** The extension's answer: done (the tab is open, the form is coming), or why not. */
export type ExtensionAnswer = { ok: true } | { ok: false; reason: string };

export function isExtensionFillCommand(message: unknown): message is ExtensionFillCommand {
   return (
      typeof message === "object" &&
      message !== null &&
      typeof (message as Partial<ExtensionFillCommand>).fill === "string"
   );
}
