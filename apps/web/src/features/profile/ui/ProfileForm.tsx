import { zodResolver } from "@hookform/resolvers/zod";
import {
   type Profile,
   profileCurrencies,
   salaryPeriods,
   seniorities,
   workModes,
} from "@jobpilot/contracts";
import type { ReactNode } from "react";
import { type UseFormRegisterReturn, useForm } from "react-hook-form";
import { Button } from "../../../shared/ui";
import { useSaveProfile } from "../api/queries";
import { fromProfile, type ProfileDraft, profileFormSchema } from "../lib/draft";

// red border while the Field around it shows an error
const inputClasses =
   "w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-xs transition-colors hover:border-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none group-data-invalid:border-red-400";
// grows with its text up to a point, then scrolls: a long skills list doesn't stretch the page
const textareaClasses = `field-sizing-content min-h-20 max-h-72 ${inputClasses}`;

/** The whole profile as one form, saved at once: each save re-evaluates every open vacancy. */
export function ProfileForm({ saved }: { saved?: Profile }) {
   const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isDirty },
   } = useForm<ProfileDraft, unknown, Profile>({
      defaultValues: fromProfile(saved),
      resolver: zodResolver(profileFormSchema),
   });
   const save = useSaveProfile();

   // what was saved becomes the form's starting point: Discard comes back to it
   const submit = handleSubmit((profile) =>
      save.mutate(profile, { onSuccess: (stored) => reset(fromProfile(stored.profile)) }),
   );
   const discard = () => {
      reset();
      save.reset();
   };
   const hasErrors = Object.keys(errors).length > 0;

   return (
      <form onSubmit={submit} className="space-y-4">
         <Section title="Contacts" hint="What goes into application forms.">
            <div className="grid gap-4 sm:grid-cols-3">
               <Field label="Full name" error={errors.contacts?.fullName?.message}>
                  <input {...register("contacts.fullName")} className={inputClasses} />
               </Field>
               <Field label="Email" error={errors.contacts?.email?.message}>
                  <input {...register("contacts.email")} className={inputClasses} />
               </Field>
               <Field label="Phone" error={errors.contacts?.phone?.message}>
                  <input {...register("contacts.phone")} className={inputClasses} />
               </Field>
            </div>
         </Section>

         <Section title="What I look for">
            <div className="grid gap-4 sm:grid-cols-2">
               <Field label="Job titles" hint="One per line, e.g. Backend Developer">
                  <textarea {...register("titles")} className={textareaClasses} />
               </Field>
               <Field label="Skills" hint="One per line, as written: Node.js, React…">
                  <textarea {...register("skills")} className={textareaClasses} />
               </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
               <Field
                  label="Experience, years"
                  hint="Whole years, in total"
                  error={errors.experienceYears?.message}
               >
                  <NumberInput registration={register("experienceYears")} />
               </Field>
               <div className="sm:col-span-3">
                  <Checkboxes
                     label="Work modes"
                     options={workModes}
                     registration={register("workModes")}
                  />
               </div>
            </div>
         </Section>

         <Section
            title="Salary"
            hint="Vacancies paying less than the minimum are skipped; AI weighs the rest against the target."
         >
            <div className="grid gap-4 sm:grid-cols-4">
               <Field label="Minimum" error={errors.salary?.min?.message}>
                  <NumberInput registration={register("salary.min")} />
               </Field>
               <Field label="Target" error={errors.salary?.target?.message}>
                  <NumberInput registration={register("salary.target")} />
               </Field>
               <Field label="Currency" error={errors.salary?.currency?.message}>
                  <select {...register("salary.currency")} className={inputClasses}>
                     {profileCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                           {currency}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field label="Per">
                  <select {...register("salary.period")} className={inputClasses}>
                     {salaryPeriods.map((period) => (
                        <option key={period} value={period}>
                           {period}
                        </option>
                     ))}
                  </select>
               </Field>
            </div>
         </Section>

         <Section
            title="Hard filters"
            hint="Checked before any AI call: a vacancy that fails one is skipped. Empty means no restriction."
         >
            <div className="grid gap-4 sm:grid-cols-4">
               <div className="sm:col-span-3">
                  <Checkboxes
                     label="Seniority"
                     options={seniorities}
                     registration={register("hardFilters.seniorities")}
                  />
               </div>
               <Field
                  label="Max years required"
                  hint="Skip vacancies asking for more"
                  error={errors.hardFilters?.maxRequiredYears?.message}
               >
                  <NumberInput registration={register("hardFilters.maxRequiredYears")} />
               </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
               <Field label="Stop words" hint="One per line: a word in the title rules it out">
                  <textarea {...register("hardFilters.stopWords")} className={textareaClasses} />
               </Field>
               <Field label="Excluded companies" hint="One per line, named as on job sites">
                  <textarea
                     {...register("hardFilters.excludeCompanies")}
                     className={textareaClasses}
                  />
               </Field>
            </div>
         </Section>

         <Section title="For AI">
            <Field
               label="Notes"
               hint="Facts for scoring and form answers: notice period, work permit, relocation…"
            >
               <textarea {...register("notes")} className={textareaClasses} />
            </Field>
            <Field
               label="Application message"
               hint="My usual short message to recruiters, adapted to each vacancy"
            >
               <textarea {...register("applicationMessage")} className={textareaClasses} />
            </Field>
         </Section>

         {/* only while there is something to save: the CV above saves on its own, with no button */}
         {isDirty && (
            <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded border border-gray-200 bg-white px-4 py-3 shadow-lg">
               <div className="text-sm">
                  {hasErrors && <p className="text-red-600">Some fields need fixing, see above.</p>}
                  {save.error && <p className="text-red-600">{save.error.message}</p>}
                  {!hasErrors && !save.error && (
                     <p className="text-gray-500">
                        Unsaved changes. Saving re-evaluates every open vacancy, with an AI call for
                        each that passes the filters.
                     </p>
                  )}
               </div>
               <div className="flex shrink-0 gap-2">
                  <Button onClick={discard} disabled={save.isPending}>
                     Discard
                  </Button>
                  <Button type="submit" variant="primary" disabled={save.isPending}>
                     {save.isPending ? "Saving…" : "Save"}
                  </Button>
               </div>
            </div>
         )}
      </form>
   );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
   return (
      <section className="rounded border border-gray-200 p-4">
         <h2 className="font-medium">{title}</h2>
         {hint && <p className="text-sm text-gray-600">{hint}</p>}
         <div className="mt-4 space-y-4">{children}</div>
      </section>
   );
}

interface FieldProps {
   label: string;
   hint?: string;
   error?: string;
   children: ReactNode;
}

/** One input under its label, with the schema's complaint about it. */
function Field({ label, hint, error, children }: FieldProps) {
   return (
      <label className="group block" data-invalid={error ? "" : undefined}>
         <span className="text-sm font-medium text-gray-800">{label}</span>
         {hint && <span className="block text-xs text-gray-500">{hint}</span>}
         <span className="mt-1 block">{children}</span>
         {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
   );
}

/** Text with a number keyboard on phones; the schema checks it is a number. */
function NumberInput({ registration }: { registration: UseFormRegisterReturn }) {
   return <input {...registration} inputMode="numeric" className={inputClasses} />;
}

interface CheckboxesProps {
   label: string;
   options: readonly string[];
   /** one name for every box: the form holds the ticked options as a list */
   registration: UseFormRegisterReturn;
}

/** Several of a fixed set. */
function Checkboxes({ label, options, registration }: CheckboxesProps) {
   return (
      <fieldset>
         <legend className="text-sm font-medium text-gray-800">{label}</legend>
         <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
            {options.map((option) => (
               <label key={option} className="flex cursor-pointer items-center gap-2">
                  <input
                     type="checkbox"
                     value={option}
                     {...registration}
                     className="size-4 cursor-pointer accent-gray-900"
                  />
                  {option}
               </label>
            ))}
         </div>
      </fieldset>
   );
}
