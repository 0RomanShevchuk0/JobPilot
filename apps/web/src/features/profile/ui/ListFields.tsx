import { languageLevels, type Profile } from "@jobpilot/contracts";
import type { ReactNode } from "react";
import { type FieldError, type UseFormReturn, useFieldArray } from "react-hook-form";
import { Button } from "../../../shared/ui";
import type { ProfileDraft } from "../lib/draft";
import { inputClasses } from "./inputs";

type ProfileFormApi = UseFormReturn<ProfileDraft, unknown, Profile>;

/** Named links to my pages: LinkedIn, GitHub, a portfolio. */
export function LinksList({ form }: { form: ProfileFormApi }) {
   const { control, register, formState } = form;
   const { fields, append, remove } = useFieldArray({ control, name: "contacts.links" });
   // the schema checks links as the profile keeps them, a URL by name: its complaint is under the
   // name, not the row's index
   const errors = formState.errors.contacts?.links as unknown as
      Record<string, FieldError | undefined> | undefined;
   const values = form.watch("contacts.links");

   return (
      <List
         label="Links"
         addLabel="Add link"
         onAdd={() => append({ name: "", url: "" })}
         empty="No links."
      >
         {fields.map((field, i) => {
            const error = errors?.[values[i]?.name.trim() ?? ""]?.message;
            return (
               <Row key={field.id} onRemove={() => remove(i)} error={error}>
                  <input
                     {...register(`contacts.links.${i}.name`)}
                     placeholder="linkedin"
                     aria-label="Name"
                     className={`${inputClasses} sm:w-40`}
                  />
                  <input
                     {...register(`contacts.links.${i}.url`)}
                     placeholder="https://…"
                     aria-label="URL"
                     aria-invalid={error ? true : undefined}
                     className={inputClasses}
                  />
               </Row>
            );
         })}
      </List>
   );
}

const locationKindLabels = { candidate: "I work from", office: "Office I'd go to" } as const;

/** Where I work from and the office cities I'd go to. */
export function LocationsList({ form }: { form: ProfileFormApi }) {
   const { control, register, formState } = form;
   const { fields, append, remove } = useFieldArray({ control, name: "locations" });
   const errors = formState.errors.locations;

   return (
      <List
         label="Locations"
         hint="City in English: office cities are matched by it. Country as a 2-letter code: DE, UA."
         addLabel="Add location"
         onAdd={() => append({ kind: "candidate", raw: "", city: "", country: "" })}
         empty="No locations."
      >
         {fields.map((field, i) => {
            const error = errors?.[i]?.raw?.message ?? errors?.[i]?.country?.message;
            return (
               <Row key={field.id} onRemove={() => remove(i)} error={error}>
                  <select
                     {...register(`locations.${i}.kind`)}
                     aria-label="Kind"
                     className={`${inputClasses} sm:w-44`}
                  >
                     {Object.entries(locationKindLabels).map(([kind, label]) => (
                        <option key={kind} value={kind}>
                           {label}
                        </option>
                     ))}
                  </select>
                  <input
                     {...register(`locations.${i}.raw`)}
                     placeholder="As written: Germany, Kyiv or remote"
                     aria-label="Place"
                     aria-invalid={errors?.[i]?.raw ? true : undefined}
                     className={inputClasses}
                  />
                  <input
                     {...register(`locations.${i}.city`)}
                     placeholder="City"
                     aria-label="City"
                     className={`${inputClasses} sm:w-36`}
                  />
                  <input
                     {...register(`locations.${i}.country`)}
                     placeholder="DE"
                     aria-label="Country"
                     aria-invalid={errors?.[i]?.country ? true : undefined}
                     maxLength={2}
                     className={`${inputClasses} sm:w-16`}
                  />
               </Row>
            );
         })}
      </List>
   );
}

/** Languages I speak, with my level when I know it. */
export function LanguagesList({ form }: { form: ProfileFormApi }) {
   const { control, register, formState } = form;
   const { fields, append, remove } = useFieldArray({ control, name: "languages" });
   const errors = formState.errors.languages;

   return (
      <List
         label="Languages"
         hint="A 2-letter code: en, uk, de."
         addLabel="Add language"
         onAdd={() => append({ code: "", level: "" })}
         empty="No languages."
      >
         {fields.map((field, i) => {
            const error = errors?.[i]?.code?.message;
            return (
               <Row key={field.id} onRemove={() => remove(i)} error={error}>
                  <input
                     {...register(`languages.${i}.code`)}
                     placeholder="en"
                     aria-label="Language"
                     aria-invalid={error ? true : undefined}
                     className={`${inputClasses} sm:w-20`}
                  />
                  <select
                     {...register(`languages.${i}.level`)}
                     aria-label="Level"
                     className={`${inputClasses} sm:w-32`}
                  >
                     <option value="">Any level</option>
                     {languageLevels.map((level) => (
                        <option key={level} value={level}>
                           {level}
                        </option>
                     ))}
                  </select>
               </Row>
            );
         })}
      </List>
   );
}

interface ListProps {
   label: string;
   hint?: string;
   addLabel: string;
   onAdd: () => void;
   /** shown when there are no rows */
   empty: string;
   children: ReactNode[];
}

/** Rows of the same kind under a label, with a button to add one more. */
function List({ label, hint, addLabel, onAdd, empty, children }: ListProps) {
   return (
      <div>
         <p className="text-sm font-medium text-gray-800">{label}</p>
         {hint && <p className="text-xs text-gray-500">{hint}</p>}
         <div className="mt-1.5 space-y-2">
            {children.length > 0 ? children : <p className="text-sm text-gray-400">{empty}</p>}
         </div>
         <Button size="sm" variant="outline" onClick={onAdd} className="mt-2">
            + {addLabel}
         </Button>
      </div>
   );
}

interface RowProps {
   onRemove: () => void;
   error?: string;
   children: ReactNode;
}

/** One row's inputs side by side, a button to remove it, and the schema's complaint about it. */
function Row({ onRemove, error, children }: RowProps) {
   return (
      <div>
         <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {children}
            <Button
               size="sm"
               variant="dangerGhost"
               onClick={onRemove}
               className="self-start sm:self-auto"
            >
               Remove
            </Button>
         </div>
         {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
   );
}
