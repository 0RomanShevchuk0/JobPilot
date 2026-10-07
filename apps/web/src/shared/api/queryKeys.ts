/**
 * Every query key in the app. Keys nest under their feature's root, so invalidating the root refreshes
 * everything below it; a feature refreshes another's data through these, without importing that feature.
 */
export const queryKeys = {
   matches: {
      all: ["matches"] as const,
      list: (filter: { status: string; includeSkipped: boolean }) =>
         ["matches", "list", filter] as const,
      details: (vacancyId: string) => ["matches", "details", vacancyId] as const,
   },
   applications: {
      all: ["applications"] as const,
      list: () => ["applications", "list"] as const,
      details: (id: string) => ["applications", "details", id] as const,
   },
   documents: {
      all: ["documents"] as const,
   },
};
