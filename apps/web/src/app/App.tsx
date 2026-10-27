import { Navigate, NavLink, Route, Routes, ScrollRestoration } from "react-router";
import { RequireSignIn, UserMenu } from "../features/sign-in";
import { ApplicationPage } from "../pages/ApplicationPage";
import { ApplicationsPage } from "../pages/ApplicationsPage";
import { DevLoginPage } from "../pages/DevLoginPage";
import { MatchesPage } from "../pages/MatchesPage";
import { ProfilePage } from "../pages/ProfilePage";
import { StatsPage } from "../pages/StatsPage";
import { VacancyPage } from "../pages/VacancyPage";
import { BriefcaseIcon, ChartIcon, SendIcon, UserIcon } from "../shared/ui";

const pages = [
   { path: "/matches", title: "Matches", Icon: BriefcaseIcon },
   { path: "/applications", title: "Applications", Icon: SendIcon },
   { path: "/profile", title: "Profile", Icon: UserIcon },
   { path: "/stats", title: "Stats", Icon: ChartIcon },
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
 * The app's pages for a signed-in user only, with a way to switch between them: the top bar on a wide
 * screen, a tab bar at the bottom on a phone (the top bar keeps the account only). A new page opens at
 * its top, going back returns to where the page was scrolled to (the list of matches mid-way).
 */
function SignedInApp() {
   return (
      <RequireSignIn>
         <ScrollRestoration />
         <div className="pb-tab-bar sm:pb-0">
            <TopBar />
            <Routes>
               <Route path="/matches" element={<MatchesPage />} />
               <Route path="/matches/:vacancyId" element={<VacancyPage />} />
               <Route path="/applications" element={<ApplicationsPage />} />
               <Route path="/applications/:id" element={<ApplicationPage />} />
               <Route path="/profile" element={<ProfilePage />} />
               <Route path="/stats" element={<StatsPage />} />
               <Route path="*" element={<Navigate to="/matches" replace />} />
            </Routes>
         </div>
         <TabBar />
      </RequireSignIn>
   );
}

/**
 * The pages' links with the tab bar's icons (from sm up; the app's name in their place below it) and
 * the account menu.
 */
function TopBar() {
   return (
      <header className="border-b border-gray-200">
         <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-2 sm:px-6">
            <span className="font-semibold text-gray-900 sm:hidden">JobPilot</span>
            <nav className="hidden items-center gap-4 sm:flex">
               {pages.map(({ path, title, Icon }) => (
                  <NavLink
                     key={path}
                     to={path}
                     className={({ isActive }) =>
                        `flex items-center gap-1.5 text-sm ${isActive ? "font-medium text-gray-900" : "text-gray-500 hover:text-gray-900"}`
                     }
                  >
                     <Icon className="size-4" />
                     {title}
                  </NavLink>
               ))}
            </nav>
            <div className="ml-auto">
               <UserMenu />
            </div>
         </div>
      </header>
   );
}

/**
 * The pages' tabs fixed at the bottom of a phone's screen, below sm. Its height is the tab-bar spacing,
 * the home indicator's strip included: the page leaves that much room under its end.
 */
function TabBar() {
   return (
      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-tab-bar border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
         {pages.map(({ path, title, Icon }) => (
            <NavLink
               key={path}
               to={path}
               className={({ isActive }) =>
                  `flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${isActive ? "font-medium text-gray-900" : "text-gray-500"}`
               }
            >
               <Icon />
               {title}
            </NavLink>
         ))}
      </nav>
   );
}
