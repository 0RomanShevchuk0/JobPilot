import type { SourceListItem } from "@jobpilot/contracts";
import { DJINNI_CATEGORIES } from "./djinni/categories.js";
import { DJINNI_ID, DJINNI_NAME } from "./djinni/site.js";
import { DOU_CATEGORIES } from "./dou/categories.js";
import { DOU_ID, DOU_NAME } from "./dou/site.js";

/**
 * Every job site with its search categories, for the web app to pick from. Data only, so it is the
 * package's own entry (@jobpilot/sources/catalog): the browser gets these lists, not the adapters
 * with their browser automation. A new source goes here as well as into the worker's sources.
 */
export const sourceCatalog: SourceListItem[] = [
   { id: DJINNI_ID, name: DJINNI_NAME, categories: DJINNI_CATEGORIES },
   { id: DOU_ID, name: DOU_NAME, categories: DOU_CATEGORIES },
];
