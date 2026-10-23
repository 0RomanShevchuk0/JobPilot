/*
 * What the web app and the JobPilot extension say to each other (chrome.runtime.sendMessage; the
 * extension's externally_connectable lets only the web app's origin in).
 */

/**
 * The extension's ids, one for each of its builds: `wxt build` for the server, `pnpm dev` for this
 * machine. Two ids, so both stay loaded in Chrome side by side. Chrome derives each from its build's
 * key (apps/extension/wxt.config.ts, which checks they match); the web talks to the one of its own
 * build, the API lets both in.
 */
export const EXTENSION_IDS = {
   production: "dakikehdmagghigijcpneocecnenklba",
   development: "mbgegdiecnhgiomfjlolphbndiggfhha",
} as const;

/** Asks whether the extension is there: it answers { ok: true }. */
export const EXTENSION_PING = "ping";

/** Opens the application's job page in a tab and fills its form in there, for the user to send. */
export interface ExtensionFillCommand {
   /** the application to fill in */
   fill: string;
}

/**
 * The web's sign-in, handed to the extension: its session's token, which the extension sends to the API
 * as Authorization: Bearer. Sent on every load of the web, so a new sign-in replaces the old token.
 */
export interface ExtensionSignIn {
   sessionToken: string;
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

export function isExtensionSignIn(message: unknown): message is ExtensionSignIn {
   return (
      typeof message === "object" &&
      message !== null &&
      typeof (message as Partial<ExtensionSignIn>).sessionToken === "string"
   );
}
