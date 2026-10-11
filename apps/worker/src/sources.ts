import type { SourceAdapter } from "@jobpilot/contracts";
import { createDjinniAdapter, createDouAdapter } from "@jobpilot/sources";

export interface SourceEntry {
   adapter: SourceAdapter;
}

/** Every source the worker collects from. A new source = a new adapter + one entry here. */
export const sources: SourceEntry[] = [
   { adapter: createDjinniAdapter() },
   { adapter: createDouAdapter() },
];

export function findSource(id: string): SourceEntry | undefined {
   return sources.find((s) => s.adapter.source === id);
}
