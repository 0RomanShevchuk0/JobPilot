import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { authClient } from "../../../shared/auth/client";
import { Menu, menuItemStyles } from "../../../shared/ui";

/**
 * Who is signed in, as their Google picture (the name's first letter without one), and a menu under
 * it: the account, the dev sign-in page (dev only), the way out.
 */
export function UserMenu() {
   const { data: session } = authClient.useSession();
   const queryClient = useQueryClient();
   if (!session) return null;
   const { name, email, image } = session.user;

   const signOut = async () => {
      await authClient.signOut();
      // the signed-out user's data stays out of reach of whoever signs in next in this tab
      queryClient.clear();
   };

   return (
      <Menu
         label="Account"
         trigger={<Avatar name={name || email} image={image} />}
         triggerClassName="flex rounded-full outline-offset-2 hover:opacity-80"
      >
         <div className="mb-1 border-b border-gray-200 px-4 py-2">
            {name && <p className="truncate font-medium text-gray-900">{name}</p>}
            <p className="truncate text-gray-500">{email}</p>
         </div>
         {import.meta.env.DEV && (
            <Link to="/dev" className={menuItemStyles}>
               Dev sign-in
            </Link>
         )}
         <button type="button" onClick={signOut} className={menuItemStyles}>
            Sign out
         </button>
      </Menu>
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
