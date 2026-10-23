import { Link, useLocation, useNavigate } from "react-router";

const BACK_LINK_STYLES = "text-sm text-gray-500 hover:text-gray-900";

/**
 * Back to where I came from in the app, as the browser's back button: the vacancy after applying to
 * it, the list on its tab and scrolled as it was. A page opened on its own (a new tab, a link from
 * outside) has nothing of the app to go back to: then it leads to its list, the fallback.
 */
export function BackLink({ fallback, fallbackLabel }: { fallback: string; fallbackLabel: string }) {
   const navigate = useNavigate();
   // "default": the first page this tab opened in the app
   const cameFromTheApp = useLocation().key !== "default";
   if (cameFromTheApp) {
      return (
         <button type="button" onClick={() => navigate(-1)} className={BACK_LINK_STYLES}>
            ← Back
         </button>
      );
   }
   return (
      <Link to={fallback} className={BACK_LINK_STYLES}>
         ← {fallbackLabel}
      </Link>
   );
}
