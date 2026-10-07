import { Navigate, NavLink, Route, Routes } from "react-router";
import { ApplicationPage } from "./ApplicationPage";
import { ApplicationsPage } from "./ApplicationsPage";
import { DocumentsPage } from "./DocumentsPage";
import { MatchesPage } from "./MatchesPage";
import { VacancyPage } from "./VacancyPage";

const pages = [
   { path: "/matches", title: "Matches" },
   { path: "/applications", title: "Applications" },
   { path: "/documents", title: "Documents" },
];

/** The app's pages under a top bar to switch between them. */
export function App() {
   return (
      <>
         <nav className="border-b border-gray-200">
            <div className="mx-auto flex max-w-4xl gap-4 px-6 py-3">
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
            </div>
         </nav>
         <Routes>
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/matches/:vacancyId" element={<VacancyPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="*" element={<Navigate to="/matches" replace />} />
         </Routes>
      </>
   );
}
