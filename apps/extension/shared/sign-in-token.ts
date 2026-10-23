import { browser } from "wxt/browser";

// in storage.local: it outlives the background and the browser's restarts
const SIGN_IN_TOKEN_KEY = "sign-in-token";

/**
 * The user's sign-in on the web, as the web hands it over: its session's token, sent to the API as
 * Authorization: Bearer. The same session as the web's: signing out there ends it here too.
 */
export const signInToken = {
   /** The token; undefined until the web, opened with the user signed in, hands it over. */
   async read(): Promise<string | undefined> {
      const stored = await browser.storage.local.get(SIGN_IN_TOKEN_KEY);
      return stored[SIGN_IN_TOKEN_KEY] as string | undefined;
   },

   async save(token: string): Promise<void> {
      await browser.storage.local.set({ [SIGN_IN_TOKEN_KEY]: token });
   },

   /** Calls back when the web hands over a token other than the kept one: a new sign-in. */
   onSaved(callback: () => void): void {
      browser.storage.onChanged.addListener((changes, area) => {
         if (area === "local" && SIGN_IN_TOKEN_KEY in changes) callback();
      });
   },
};
