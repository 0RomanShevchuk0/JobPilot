import { Navigate, NavLink, Route, Routes, ScrollRestoration } from "react-router";
import { RequireSignIn, UserMenu } from "../features/sign-in";
import { ApplicationPage } from "../pages/ApplicationPage";
import { ApplicationsPage } from "../pages/ApplicationsPage";
import { DevLoginPage } from "../pages/DevLoginPage";
import { MatchesPage } from "../pages/MatchesPage";
import { ProfilePage } from "../pages/ProfilePage";
import { StatsPage } from "../pages/StatsPage";
import { VacancyPage } from "../pages/VacancyPage";

const pages = [
   { path: "/matches", title: "Matches" },
   { path: "/applications", title: "Applications" },
   { path: "/profile", title: "Profile" },
   { path: "/stats", title: "Stats" },
];

/**
 * The app. Everything is behind sign-in (SignedInApp), except the dev sign-in page, which sits outside
 * it so it opens with no session too (dev only).
 */
export function App() {
   return (
      <Routes>
         {import.meta.env.DEV && <Route path="/dev" element={<DevLoginPage />} />}
         <Route path="*" element={<SignedInApp />} />
      </Routes>
   );
}

/**
 * The app's pages under a top bar to switch between them, for a signed-in user only. A new page opens
 * at its top, going back returns to where the page was scrolled to (the list of matches mid-way).
 */
function SignedInApp() {
   return (
      <RequireSignIn>
         <ScrollRestoration />
         <nav className="border-b border-gray-200">
            <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-3">
               {pages.map((page) => (
                  <NavLink
                     key={page.path}
                     to={page.path}
                     className={({ isActive }) =>
                        `text-sm ${isActive ? "font-medium text-gray-900" : "text-gray-500 hover:text-gray-900"}`
                     }
                  >
                     {page.title}
                  </NavLink>
               ))}
               {import.meta.env.DEV && (
                  <NavLink to="/dev" className="text-sm text-gray-400 hover:text-gray-900">
                     Dev
                  </NavLink>
               )}
               <div className="ml-auto">
                  <UserMenu />
               </div>
            </div>
         </nav>
         <Routes>
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/matches/:vacancyId" element={<VacancyPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="*" element={<Navigate to="/matches" replace />} />
         </Routes>
      </RequireSignIn>
   );
}
