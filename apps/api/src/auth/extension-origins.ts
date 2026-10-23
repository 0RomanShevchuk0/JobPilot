import { EXTENSION_IDS } from "@jobpilot/contracts";

/**
 * Where the JobPilot extension's requests come from: both builds', the server's and the dev one. Either
 * gets in only with a signed-in user's token, so letting the dev build in on the server opens nothing.
 */
export const EXTENSION_ORIGINS = Object.values(EXTENSION_IDS).map(
   (id) => `chrome-extension://${id}`,
);
