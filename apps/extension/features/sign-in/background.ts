import { isExtensionSignIn } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { signInToken } from "../../shared/sign-in-token.js";

/** The web's sign-in, kept for the API's requests: the web hands it over whenever it is opened. */
export function registerSignIn(): void {
   // the answer says it is kept; `true` keeps the channel open for it, it comes after storage's write
   browser.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
      if (!isExtensionSignIn(message)) return;
      signInToken.save(message.sessionToken).then(() => sendResponse({ ok: true }));
      return true;
   });
}
