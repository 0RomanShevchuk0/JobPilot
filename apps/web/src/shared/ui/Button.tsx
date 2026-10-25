import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "dangerGhost";
export type ButtonSize = "sm" | "md";

// every one has a border, transparent but outline's: buttons side by side are the same height
const variants: Record<ButtonVariant, string> = {
   primary: "border-transparent bg-gray-900 text-white hover:bg-gray-700",
   secondary: "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200",
   outline: "border-gray-300 text-gray-700 hover:bg-gray-50",
   danger: "border-transparent bg-red-600 text-white hover:bg-red-700",
   dangerGhost: "border-transparent text-red-600 hover:bg-red-50",
};

const sizes: Record<ButtonSize, string> = {
   sm: "px-2 py-1",
   md: "px-3 py-1",
};

interface ButtonLook {
   variant?: ButtonVariant;
   size?: ButtonSize;
}

/**
 * A button's classes, for links that look like buttons. The label stays on one line: squeezed, a
 * button wraps into a tall block; the text around it gives way instead.
 */
export function buttonStyles({ variant = "secondary", size = "md" }: ButtonLook = {}): string {
   return `rounded border text-sm whitespace-nowrap disabled:opacity-50 ${sizes[size]} ${variants[variant]}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
   ButtonLook & {
      /** what it started is under way: a spinner before the label, and no second click meanwhile */
      loading?: boolean;
   };

export function Button({
   variant,
   size,
   className,
   type = "button",
   loading = false,
   disabled,
   children,
   ...props
}: Props) {
   const classes = [
      buttonStyles({ variant, size }),
      "inline-flex items-center justify-center gap-1.5",
      className,
   ]
      .filter(Boolean)
      .join(" ");
   return (
      <button type={type} className={classes} disabled={disabled || loading} {...props}>
         {loading && <Spinner className="size-3.5" />}
         {children}
      </button>
   );
}
