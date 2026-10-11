import type { ExpiredSession } from "@jobpilot/contracts";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

/** The job sites where my session stopped working, as the worker last found it. */
export function useExpiredSessions() {
   return useQuery({
      queryKey: queryKeys.sessions.expired,
      queryFn: () => apiGet<ExpiredSession[]>("/sources/sessions"),
   });
}
