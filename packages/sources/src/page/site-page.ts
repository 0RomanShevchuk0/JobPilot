/**
 * What filling a job site's application form in the user's own browser needs to know about the site,
 * run on the job page itself (the extension's script in the tab). DOM only: no cheerio, no Node.
 */
export interface SitePage {
   /**
    * Presses the site's button for the application form and resolves with the form once it is on
    * screen. Throws with the reason, for the user, when the page offers none: logged out, closed,
    * applied to already, applied to on the employer's site.
    */
   openForm(document: Document): Promise<HTMLFormElement>;
   /** The button the user sends the form with, to bring into view once it is filled in. */
   sendButton(form: HTMLFormElement): HTMLElement | null;
   /** Whether a POST the tab made is the form being sent, by its URL and the job page's. */
   isFormSubmission(requestUrl: string, jobUrl: string): boolean;
   /**
    * On the page the site answered the post with: whether it took the form, or showed it back with
    * errors for the user to fix. A post going through says neither: sites answer a rejected form with 200.
    */
   isFormAccepted(document: Document): boolean;
}

// how long the form gets to show up after the button is pressed
const FORM_TIMEOUT_MS = 10_000;
const FORM_POLL_MS = 100;

/** The form once the page shows it; the button pressing only reveals what is already in the page. */
export async function visibleForm(document: Document, selector: string): Promise<HTMLFormElement> {
   const deadline = Date.now() + FORM_TIMEOUT_MS;
   while (Date.now() < deadline) {
      const form = document.querySelector<HTMLFormElement>(selector);
      if (form?.checkVisibility()) return form;
      await new Promise((resolve) => setTimeout(resolve, FORM_POLL_MS));
   }
   throw new Error("The application form didn't open on the page");
}
