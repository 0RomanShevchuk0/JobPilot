import type { SourceAdapter } from "@jobpilot/contracts";
import { createDjinniAdapter, createDouAdapter } from "@jobpilot/sources";
import { config } from "./config.js";

export interface SourceEntry {
   adapter: SourceAdapter;
   keywords: string[];
}

/** Every source the worker collects from. A new source = a new adapter + one entry here. */
export const sources: SourceEntry[] = [
   {
      adapter: createDjinniAdapter(),
      keywords: config.djinniKeywords,
   },
   {
      adapter: createDouAdapter(),
      keywords: config.douCategories,
   },
];

export function findSource(id: string): SourceEntry | undefined {
   return sources.find((s) => s.adapter.source === id);
}
