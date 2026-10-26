import { useState } from "react";
import { useDevLoginUsers } from "../features/sign-in";
import { BackLink, buttonStyles } from "../shared/ui";

/**
 * Dev only: sign in as any user without Google, by a link the API builds (the dev-login plugin). Its
 * route is outside RequireSignIn (App), so it opens with no session too — the first way in — and the
 * top bar links here to switch accounts. Empty when DEV_LOGIN_SECRET isn't set (the route 404s).
 */
export function DevLoginPage() {
   const users = useDevLoginUsers();
   const [filter, setFilter] = useState("");
   const needle = filter.trim().toLowerCase();
   const shown = needle
      ? users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(needle))
      : users;

   return (
      <main className="mx-auto max-w-2xl p-6">
         <BackLink fallback="/matches" fallbackLabel="App" />
         <h1 className="mt-2 text-2xl font-semibold">Dev sign-in</h1>
         <p className="mt-1 mb-6 text-sm text-gray-500">
            Sign in as any user, no Google. Dev only — this page doesn't exist in production.
         </p>

         {users.length === 0 ? (
            <p className="text-sm text-gray-500">
               No users to show. Is DEV_LOGIN_SECRET set in your .env?
            </p>
         ) : (
            <>
               <input
                  type="search"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter by name or email"
                  className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
               />
               {shown.length === 0 ? (
                  <p className="text-sm text-gray-500">No user matches "{filter}".</p>
               ) : (
                  <ul className="divide-y divide-gray-200 rounded border border-gray-200">
                     {shown.map((user) => (
                        <li
                           key={user.email}
                           className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                           <span className="min-w-0">
                              <span className="block truncate font-medium">
                                 {user.name || user.email}
                              </span>
                              {user.name && (
                                 <span className="block truncate text-sm text-gray-500">
                                    {user.email}
                                 </span>
                              )}
                           </span>
                           <a href={user.url} className={buttonStyles({ variant: "primary" })}>
                              Sign in
                           </a>
                        </li>
                     ))}
                  </ul>
               )}
            </>
         )}
      </main>
   );
}
