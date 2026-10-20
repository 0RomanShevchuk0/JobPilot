import { djinniPage } from "./djinni/page.js";
import { DJINNI_ID } from "./djinni/site.js";
import { douPage } from "./dou/page.js";
import { DOU_ID } from "./dou/site.js";
import type { SitePage } from "./page/site-page.js";

/*
 * Filling a job site's application form on its own page, in the user's browser (the extension): the
 * package's own entry (@jobpilot/sources/page), DOM only, so the browser gets this without the adapters
 * and their Node dependencies. A new source goes here as well as into the worker's sources.
 */

export { fillFields, type PageFillValue } from "./page/fill-fields.js";
export type { SitePage } from "./page/site-page.js";

/** Each job site's page, by the source's id. */
export const sitePages: Record<string, SitePage> = {
   [DJINNI_ID]: djinniPage,
   [DOU_ID]: douPage,
};
