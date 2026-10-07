import type { SourceAdapter } from "@jobpilot/contracts";
import {
   createDjinniAdapter,
   createDouAdapter,
   DJINNI_BASE_URL,
   DOU_BASE_URL,
} from "@jobpilot/sources";
import { config } from "./config.js";

export interface SourceEntry {
   adapter: SourceAdapter;
   name: string;
   baseUrl: string;
   keywords: string[];
   /** At most one page fetch per this many ms, to stay polite and avoid bans. */
   fetchIntervalMs: number;
}

/** Every source the worker collects from. A new source = a new adapter + one entry here. */
export const sources: SourceEntry[] = [
   {
      adapter: createDjinniAdapter(),
      name: "Djinni",
      baseUrl: DJINNI_BASE_URL,
      keywords: config.djinniKeywords,
      fetchIntervalMs: 3000,
   },
   {
      adapter: createDouAdapter(),
      name: "DOU",
      baseUrl: DOU_BASE_URL,
      keywords: config.douCategories,
      fetchIntervalMs: 3000,
   },
];

export function findSource(id: string): SourceEntry | undefined {
   return sources.find((s) => s.adapter.source === id);
}
