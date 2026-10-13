import { zodResolver } from "@hookform/resolvers/zod";
import {
   type Profile,
   profileCurrencies,
   salaryPeriods,
   seniorities,
   workModes,
} from "@jobpilot/contracts";
import { picksNewCategories, sameForMatching } from "@jobpilot/matching";
import { type ReactNode, useState } from "react";
import { type Control, Controller, type UseFormRegisterReturn, useForm } from "react-hook-form";
import { Button, ReevaluatesMark } from "../../../shared/ui";
import { useProfileFromCv, useSaveProfile } from "../api/queries";
import { fillFromCv, fromProfile, type ProfileDraft, profileFormSchema } from "../lib/draft";
import { inputClasses, textareaClasses } from "./inputs";
import { JobSites } from "./JobSites";
import { LanguagesList, LinksList, LocationsList } from "./ListFields";
import { TagsInput } from "./TagsInput";

interface ProfileFormProps {
   saved?: Profile;
   /** a CV is uploaded: its fields can fill the form */
   hasCv: boolean;
}

/** The whole profile as one form, saved at once: each save re-evaluates every open vacancy. */
export function ProfileForm({ saved, hasCv }: ProfileFormProps) {
   const form = useForm<ProfileDraft, unknown, Profile>({
      defaultValues: fromProfile(saved),
      resolver: zodResolver(profileFormSchema),
   });
   const {
      control,
      register,
      handleSubmit,
      reset,
      getValues,
      watch,
      formState: { errors, isDirty },
   } = form;
   const save = useSaveProfile();
   const fromCv = useProfileFromCv();
   // the CV gave nothing for the empty fields, or none was empty: said instead of a silent no-op
   const [nothingFilled, setNothingFilled] = useState(false);

   // what was saved becomes the form's starting point: Discard comes back to it
   const submit = handleSubmit((profile) =>
      save.mutate(profile, { onSuccess: (stored) => reset(fromProfile(stored.profile)) }),
   );
   // the saved profile stays the starting point: the filled fields are unsaved changes, Discard drops them
   const fill = () => {
      setNothingFilled(false);
      fromCv.mutate(undefined, {
         onSuccess: (fields) => {
            const current = getValues();
            const filled = fillFromCv(current, fields);
            if (JSON.stringify(filled) === JSON.stringify(current)) setNothingFilled(true);
            else reset(filled, { keepDefaultValues: true });
         },
      });
   };
   const discard = () => {
      reset();
      save.reset();
      fromCv.reset();
      setNothingFilled(false);
   };
   const hasErrors = Object.keys(errors).length > 0;
   // the check the API makes on save; while the form doesn't pass the schema, say the costly case
   const edited = isDirty ? profileFormSchema.safeParse(watch()) : undefined;
   const reevaluates = !saved || !edited?.success || !sameForMatching(saved, edited.data);
   // a category added on a job site: the vacancies already found in it get evaluated, nothing else
   const evaluatesNew = !reevaluates && picksNewCategories(saved, edited.data);
   const saveNote = reevaluates
      ? "Unsaved changes. Saving re-evaluates every open vacancy, with an AI call for each that passes the filters."
      : evaluatesNew
        ? "Unsaved changes. Saving evaluates the vacancies already found in the categories you added."
        : "Unsaved changes. They don't affect evaluations: nothing is re-evaluated.";

   return (
      <form onSubmit={submit} className="space-y-4">
         {/* shown without a CV too: whoever starts typing first learns the CV can fill the rest */}
         <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Button onClick={fill} disabled={!hasCv || fromCv.isPending}>
               {fromCv.isPending ? "Reading the CV…" : "Fill from CV"}
            </Button>
            {!hasCv ? (
               <p className="text-gray-500">Upload a CV above to fill the empty fields from it.</p>
            ) : fromCv.error ? (
               <p className="text-red-600">{fromCv.error.message}</p>
            ) : nothingFilled ? (
               <p className="text-gray-500">
                  Nothing to fill: those fields are already filled, or the CV doesn't have them.
               </p>
            ) : (
               <p className="text-gray-500">
                  Fills the empty fields from your CV. Check them before saving.
               </p>
            )}
         </div>
         <Section title="Applying" hint="How to reach me and my usual message to recruiters.">
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
            <LinksList form={form} />
            <Field label="Application message" hint="Adapted to each vacancy when applying">
               <textarea {...register("applicationMessage")} className={textareaClasses} />
            </Field>
         </Section>

         {/* no mark: what is searched for decides what is found, not how it is evaluated */}
         <Section
            title="Job sites"
            hint="Where to look: the categories to read on each site. A site with nothing picked is off."
         >
            <JobSites form={form} />
         </Section>

         <Section title="What I look for" reevaluates>
            <div className="grid gap-4 sm:grid-cols-2">
               <Tags
                  control={control}
                  name="titles"
                  label="Job titles"
                  placeholder="Backend Developer"
               />
               <Tags
                  control={control}
                  name="skills"
                  label="Skills"
                  hint="As written: Node.js, React…"
                  placeholder="Node.js"
               />
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

         <Section title="Location and languages" reevaluates>
            <LocationsList form={form} />
            <LanguagesList form={form} />
         </Section>

         <Section
            title="Salary"
            reevaluates
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
            reevaluates
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
               <Tags
                  control={control}
                  name="hardFilters.stopWords"
                  label="Stop words"
                  hint="A word in the title rules the vacancy out"
                  placeholder="PHP"
               />
               <Tags
                  control={control}
                  name="hardFilters.excludeCompanies"
                  label="Excluded companies"
                  hint="Named as on job sites"
                  placeholder="Company name"
               />
            </div>
         </Section>

         <Section
            title="Notes"
            hint="Facts for scoring and form answers: notice period, work permit, relocation…"
            reevaluates
         >
            <textarea {...register("notes")} aria-label="Notes" className={textareaClasses} />
         </Section>

         {/* only while there is something to save: the CV above saves on its own, with no button */}
         {isDirty && (
            <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded border border-gray-200 bg-white px-4 py-3 shadow-lg">
               <div className="text-sm">
                  {hasErrors && <p className="text-red-600">Some fields need fixing, see above.</p>}
                  {save.error && <p className="text-red-600">{save.error.message}</p>}
                  {!hasErrors && !save.error && (
                     <p className="flex items-center gap-1.5 text-gray-500">
                        {reevaluates && <ReevaluatesMark />}
                        {saveNote}
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

interface SectionProps {
   title: string;
   hint?: string;
   /** every field in it is one matching reads: the mark goes on the section, not on each field */
   reevaluates?: boolean;
   children: ReactNode;
}

function Section({ title, hint, reevaluates, children }: SectionProps) {
   return (
      <section className="rounded border border-gray-200 p-4">
         <h2 className="flex items-center gap-1.5 font-medium">
            {title}
            {reevaluates && <ReevaluatesMark />}
         </h2>
         {hint && <p className="text-sm text-gray-600">{hint}</p>}
         <div className="mt-4 space-y-4">{children}</div>
      </section>
   );
}

interface FieldProps {
   label: string;
   hint?: string;
   error?: string;
   /**
    * "div" around inputs with buttons inside: a label passes a click anywhere in it on to the first
    * button, and the chips' × would fire on a click at a chip
    */
   as?: "label" | "div";
   children: ReactNode;
}

/** One input under its label, with the schema's complaint about it. */
function Field({ label, hint, error, as: Tag = "label", children }: FieldProps) {
   return (
      <Tag className="group block" data-invalid={error ? "" : undefined}>
         <span className="text-sm font-medium text-gray-800">{label}</span>
         {hint && <span className="block text-xs text-gray-500">{hint}</span>}
         <span className="mt-1 block">{children}</span>
         {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </Tag>
   );
}

interface TagsProps {
   control: Control<ProfileDraft, unknown, Profile>;
   name: "titles" | "skills" | "hardFilters.stopWords" | "hardFilters.excludeCompanies";
   label: string;
   hint?: string;
   placeholder: string;
}

/** A list of words as chips, under its label. */
function Tags({ control, name, label, hint, placeholder }: TagsProps) {
   return (
      <Field
         label={label}
         hint={hint ?? "Enter after each; a pasted list adds one per line"}
         as="div"
      >
         <Controller
            control={control}
            name={name}
            render={({ field }) => (
               <TagsInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  label={label}
                  placeholder={placeholder}
               />
            )}
         />
      </Field>
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
