/*
 * What the web app sends the extension (externally_connectable in the manifest lets only its origin):
 * "ping", to learn the extension is there, and the command to fill an application in a tab.
 */

export const PING_MESSAGE = "ping";

export interface FillCommand {
   /** the application to fill in */
   fill: string;
}

export function isFillCommand(message: unknown): message is FillCommand {
   return (
      typeof message === "object" &&
      message !== null &&
      typeof (message as Partial<FillCommand>).fill === "string"
   );
}
