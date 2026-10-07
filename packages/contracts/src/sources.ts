/** The job sites JobPilot reads, by their id: sources.id and postings.source_id in the database. */
export const SourceIds = {
   djinni: "djinni",
   dou: "dou",
} as const;
export type SourceId = (typeof SourceIds)[keyof typeof SourceIds];
