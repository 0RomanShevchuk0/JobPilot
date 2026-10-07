import { choiceFieldKinds, type FormField } from "@jobpilot/contracts";
import { Badge } from "../../../shared/ui";

const sourceLabels: Record<FormField["valueSource"], string> = {
   ai: "AI",
   profile: "profile",
   document: "document",
};

interface AnswerProps {
   field: FormField;
   /** what the input shows: my unsaved change, else the saved answer */
   value: string;
   editable: boolean;
   onChange: (value: string) => void;
}

/** One form field with its answer and where the answer came from. */
export function FieldAnswer(props: AnswerProps) {
   const { field } = props;
   return (
      <li className="rounded border border-gray-200 p-4">
         <div className="flex items-start justify-between gap-4">
            <p className="font-medium">
               {field.label}
               {field.required && <span className="text-red-600"> *</span>}
            </p>
            <Badge>{field.editedByUser ? "edited" : sourceLabels[field.valueSource]}</Badge>
         </div>
         <div className="mt-2">
            <AnswerInput {...props} />
         </div>
      </li>
   );
}

/** The answer in the input its kind takes: text, one of the options, or as text when it can't be edited. */
function AnswerInput({ field, value, editable, onChange }: AnswerProps) {
   const choice = choiceFieldKinds.includes(field.kind) && field.options;
   if (choice && field.kind === "radio") {
      return (
         <div className="flex flex-wrap gap-4 text-sm">
            {field.options!.map((option) => (
               <label key={option} className="flex items-center gap-2">
                  <input
                     type="radio"
                     name={field.name}
                     checked={value === option}
                     disabled={!editable}
                     onChange={() => onChange(option)}
                  />
                  {option}
               </label>
            ))}
         </div>
      );
   }
   if (choice) {
      return (
         <select
            value={value}
            disabled={!editable}
            onChange={(e) => onChange(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-50"
         >
            {field.options!.map((option) => (
               <option key={option} value={option}>
                  {option}
               </option>
            ))}
         </select>
      );
   }
   if (field.kind === "text" || field.kind === "textarea" || field.kind === "number") {
      return (
         <textarea
            value={value}
            disabled={!editable}
            onChange={(e) => onChange(e.target.value)}
            className="field-sizing-content min-h-10 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 disabled:bg-gray-50"
         />
      );
   }
   return value ? (
      <p className="text-sm whitespace-pre-wrap text-gray-700">{value}</p>
   ) : (
      <p className="text-sm text-gray-400">No answer</p>
   );
}
