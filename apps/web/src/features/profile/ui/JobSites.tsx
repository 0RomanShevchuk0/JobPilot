import type { Profile, SourceCategory, SourceListItem } from "@jobpilot/contracts";
import { sourceCatalog } from "@jobpilot/sources/catalog";
import { type UseFormReturn, useWatch } from "react-hook-form";
import type { ProfileDraft } from "../lib/draft";

type ProfileFormApi = UseFormReturn<ProfileDraft, unknown, Profile>;

/** Every job site, folded: its line says what is picked there, or that it is off. */
export function JobSites({ form }: { form: ProfileFormApi }) {
   return (
      <div className="space-y-2">
         {sourceCatalog.map((source) => (
            <JobSite key={source.id} form={form} source={source} />
         ))}
      </div>
   );
}

function JobSite({ form, source }: { form: ProfileFormApi; source: SourceListItem }) {
   const name = `sourceCategories.${source.id}` as const;
   const picked = useWatch({ control: form.control, name });
   return (
      <details className="rounded border border-gray-200">
         <summary className="flex cursor-pointer items-center justify-between gap-4 px-3 py-2 text-sm">
            <span className="font-medium text-gray-800">{source.name}</span>
            <span className="truncate text-gray-500">
               {picked.length > 0 ? picked.join(", ") : "Off"}
            </span>
         </summary>
         <div className="space-y-3 border-t border-gray-200 p-3">
            {groupsOf(source.categories).map(([group, categories]) => (
               <fieldset key={group}>
                  {group && (
                     <legend className="text-xs font-medium text-gray-500 uppercase">
                        {group}
                     </legend>
                  )}
                  <div className="mt-1.5 grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
                     {categories.map((category) => (
                        <label
                           key={category.value}
                           className="flex cursor-pointer items-start gap-2 text-sm text-gray-700"
                        >
                           {/* one name for every box of the site: the form holds the ticked ones as a list */}
                           <input
                              type="checkbox"
                              value={category.value}
                              {...form.register(name)}
                              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-gray-900"
                           />
                           {category.label ?? category.value}
                        </label>
                     ))}
                  </div>
               </fieldset>
            ))}
         </div>
      </details>
   );
}

/** The categories under the site's own headings, in its order; "" for a site without groups. */
function groupsOf(categories: readonly SourceCategory[]): [string, SourceCategory[]][] {
   const groups = new Map<string, SourceCategory[]>();
   for (const category of categories) {
      const group = category.group ?? "";
      groups.set(group, [...(groups.get(group) ?? []), category]);
   }
   return [...groups];
}
