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

const inputClasses = "w-full rounded border border-gray-300 px-2 py-1 text-sm";
const textareaClasses = `field-sizing-content min-h-16 ${inputClasses}`;

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

   const submit = handleSubmit((profile) => save.mutate(profile));
   const discard = () => {
      reset();
      save.reset();
   };
   const hasErrors = Object.keys(errors).length > 0;

   return (
      <form onSubmit={submit} className="space-y-8">
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
                  hint="Total professional experience, whole years"
                  error={errors.experienceYears?.message}
               >
                  <NumberInput registration={register("experienceYears")} />
               </Field>
            </div>
            <Checkboxes
               label="Work modes"
               options={workModes}
               registration={register("workModes")}
            />
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
            <Checkboxes
               label="Seniority"
               options={seniorities}
               registration={register("hardFilters.seniorities")}
            />
            <div className="grid gap-4 sm:grid-cols-4">
               <Field
                  label="Max required experience, years"
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

         <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-gray-200 bg-white py-3">
            <div className="text-sm">
               {hasErrors && <p className="text-red-600">Some fields need fixing, see above.</p>}
               {save.error && <p className="text-red-600">{save.error.message}</p>}
               {!hasErrors && !save.error && (
                  <p className="text-gray-500">
                     Saving re-evaluates every open vacancy, with an AI call for each that passes
                     the filters.
                  </p>
               )}
            </div>
            <div className="flex shrink-0 gap-2">
               <Button onClick={discard} disabled={!isDirty || save.isPending}>
                  Discard
               </Button>
               <Button type="submit" variant="primary" disabled={!isDirty || save.isPending}>
                  {save.isPending ? "Saving…" : "Save"}
               </Button>
            </div>
         </div>
      </form>
   );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
   return (
      <section>
         <h2 className="font-medium">{title}</h2>
         {hint && <p className="text-sm text-gray-500">{hint}</p>}
         <div className="mt-3 space-y-4">{children}</div>
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
      <label className="block">
         <span className="text-sm text-gray-700">{label}</span>
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
         <legend className="text-sm text-gray-700">{label}</legend>
         <div className="mt-1 flex flex-wrap gap-4 text-sm">
            {options.map((option) => (
               <label key={option} className="flex items-center gap-2">
                  <input type="checkbox" value={option} {...registration} />
                  {option}
               </label>
            ))}
         </div>
      </fieldset>
   );
}
