import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { authClient } from "../../../shared/auth/client";

/**
 * Who is signed in, as their Google picture (the name's first letter without one), and a menu under
 * it: the account, the dev sign-in page (dev only), the way out. A click outside or Esc closes it.
 */
export function UserMenu() {
   const { data: session } = authClient.useSession();
   const queryClient = useQueryClient();
   const [open, setOpen] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (!open) return;
      const closeOnOutsideClick = (event: PointerEvent) => {
         if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
      };
      const closeOnEscape = (event: KeyboardEvent) => {
         if (event.key === "Escape") setOpen(false);
      };
      document.addEventListener("pointerdown", closeOnOutsideClick);
      document.addEventListener("keydown", closeOnEscape);
      return () => {
         document.removeEventListener("pointerdown", closeOnOutsideClick);
         document.removeEventListener("keydown", closeOnEscape);
      };
   }, [open]);

   if (!session) return null;
   const { name, email, image } = session.user;

   const signOut = async () => {
      await authClient.signOut();
      // the signed-out user's data stays out of reach of whoever signs in next in this tab
      queryClient.clear();
   };

   return (
      <div ref={menuRef} className="relative">
         <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Account"
            aria-expanded={open}
            className="flex rounded-full outline-offset-2 hover:opacity-80"
         >
            <Avatar name={name || email} image={image} />
         </button>
         {open && (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg">
               <div className="border-b border-gray-200 px-4 py-2">
                  {name && <p className="truncate font-medium text-gray-900">{name}</p>}
                  <p className="truncate text-gray-500">{email}</p>
               </div>
               {import.meta.env.DEV && (
                  <Link
                     to="/dev"
                     onClick={() => setOpen(false)}
                     className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                     Dev sign-in
                  </Link>
               )}
               <button
                  type="button"
                  onClick={signOut}
                  className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
               >
                  Sign out
               </button>
            </div>
         )}
      </div>
   );
}

/** The account's picture, or the first letter of its name in a circle of the same size. */
function Avatar({ name, image }: { name: string; image?: string | null }) {
   if (image) {
      return (
         <img src={image} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
      );
   }
   return (
      <span className="flex size-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700 uppercase">
         {name.charAt(0)}
      </span>
   );
}
