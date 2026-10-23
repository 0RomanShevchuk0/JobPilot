import {
   EXTENSION_PING,
   type ExtensionAnswer,
   type ExtensionFillCommand,
   type ExtensionSignIn,
} from "@jobpilot/contracts";

/**
 * The part of chrome.runtime a web page gets: Chrome puts it on pages an installed extension lets in
 * (externally_connectable). Absent in other browsers, and while no such extension is installed.
 */
interface PageRuntime {
   sendMessage(extensionId: string, message: unknown, callback: (answer: unknown) => void): void;
   lastError?: { message?: string };
}

/** Whether the JobPilot extension is installed and on in this browser. */
export async function isExtensionInstalled(): Promise<boolean> {
   const answer = await sendToExtension<ExtensionAnswer>(EXTENSION_PING);
   return answer?.ok === true;
}

/**
 * Asks the extension to open the application's job page in a tab and fill its form in there.
 * Undefined when the extension didn't answer: not installed, or turned off.
 */
export function fillInExtension(applicationId: string): Promise<ExtensionAnswer | undefined> {
   const command: ExtensionFillCommand = { fill: applicationId };
   return sendToExtension<ExtensionAnswer>(command);
}

/**
 * Hands the extension this browser's sign-in: it sends the session's token to the API from then on.
 * Nothing happens without the extension.
 */
export async function sendSignInToExtension(sessionToken: string): Promise<void> {
   const signIn: ExtensionSignIn = { sessionToken };
   await sendToExtension(signIn);
}

/** A message to the extension and its answer; undefined when there is no extension to answer. */
function sendToExtension<Answer>(message: unknown): Promise<Answer | undefined> {
   const runtime = (globalThis as { chrome?: { runtime?: PageRuntime } }).chrome?.runtime;
   if (!runtime) return Promise.resolve(undefined);
   return new Promise((resolve) => {
      runtime.sendMessage(import.meta.env.EXTENSION_ID, message, (answer) => {
         // read to mark it handled: no extension with this id ("Could not establish connection")
         if (runtime.lastError) resolve(undefined);
         else resolve(answer as Answer);
      });
   });
}
