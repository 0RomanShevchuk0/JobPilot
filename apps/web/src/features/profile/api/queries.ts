import type { Profile } from "@jobpilot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

/** The profile with its version, as GET and PUT /profile return it. */
export interface SavedProfile {
   profile: Profile;
   /** +1 on every save */
   version: number;
}

/** My profile; null until the first save. */
export function useProfile() {
   return useQuery({
      queryKey: queryKeys.profile.all,
      // the API answers with no body when there is no profile, and a query can't hold undefined
      queryFn: async () => (await apiGet<SavedProfile | undefined>("/profile")) ?? null,
   });
}

/** Replaces the whole profile; the API then re-evaluates every open vacancy against it. */
export function useSaveProfile() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (profile: Profile) => apiPut<SavedProfile>("/profile", profile),
      onSuccess: (saved) => queryClient.setQueryData(queryKeys.profile.all, saved),
   });
}
