import { useEffect, useState } from "react";

/** A user with a ready dev sign-in link, from GET /api/auth/dev-login/users. */
export interface DevUser {
   email: string;
   name: string;
   url: string;
}

/**
 * Dev only: the users with a ready dev sign-in link. Empty in production (the route is gone) or when
 * DEV_LOGIN_SECRET is unset (the plugin isn't added, so the request 404s), which hides the dev UI.
 */
export function useDevLoginUsers(): DevUser[] {
   const [users, setUsers] = useState<DevUser[]>([]);
   useEffect(() => {
      void fetch("/api/auth/dev-login/users")
         .then((response) => (response.ok ? (response.json() as Promise<DevUser[]>) : []))
         .then(setUsers)
         .catch(() => setUsers([]));
   }, []);
   return users;
}
