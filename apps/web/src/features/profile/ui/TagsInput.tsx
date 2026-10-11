import { type ClipboardEvent, type KeyboardEvent, useRef, useState } from "react";

interface TagsInputProps {
   value: string[];
   onChange: (value: string[]) => void;
   onBlur?: () => void;
   /** the input's accessible name: it sits in a Field that can't be a label (see Field) */
   label: string;
   placeholder?: string;
}

/**
 * A list of short words as chips: Enter adds what is typed, × or Backspace on an empty input removes.
 * A pasted list adds one chip per line. Commas don't split: company names have them.
 */
export function TagsInput({ value, onChange, onBlur, label, placeholder }: TagsInputProps) {
   const input = useRef<HTMLInputElement>(null);
   const [text, setText] = useState("");

   // trimmed, and once: "react" is not added next to "React"
   const add = (raw: string) => {
      const next = [...value];
      for (const line of raw.split("\n")) {
         const tag = line.trim();
         if (tag && !next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag);
      }
      if (next.length !== value.length) onChange(next);
      setText("");
   };
   const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

   const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
         e.preventDefault(); // would submit the form
         add(text);
      } else if (e.key === "Backspace" && text === "" && value.length > 0) {
         removeAt(value.length - 1);
      }
   };
   const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      if (!pasted.includes("\n")) return; // one word: let it into the input as usual
      e.preventDefault();
      add(text + pasted);
   };

   return (
      // a click anywhere in the box puts the cursor into the input, as in a plain text field
      <div
         onClick={() => input.current?.focus()}
         className="flex w-full cursor-text flex-wrap gap-1.5 rounded border border-gray-300 bg-white px-2 py-1.5 shadow-xs transition-colors group-data-invalid:border-red-400 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 hover:border-gray-400"
      >
         {value.map((tag, i) => (
            <span
               key={tag}
               className="inline-flex items-center gap-1 rounded bg-gray-100 py-0.5 pr-1 pl-2 text-sm text-gray-800"
            >
               {tag}
               <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => removeAt(i)}
                  className="rounded px-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
               >
                  ×
               </button>
            </span>
         ))}
         <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            // a word typed and left without Enter still counts: clicking Save goes through here
            onBlur={() => {
               add(text);
               onBlur?.();
            }}
            aria-label={label}
            placeholder={value.length === 0 ? placeholder : undefined}
            className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-gray-900 outline-none"
         />
      </div>
   );
}
