import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "dangerGhost";
export type ButtonSize = "sm" | "md";

const variants: Record<ButtonVariant, string> = {
   primary: "bg-gray-900 text-white hover:bg-gray-700",
   secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
   outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
   danger: "bg-red-600 text-white hover:bg-red-700",
   dangerGhost: "text-red-600 hover:bg-red-50",
};

const sizes: Record<ButtonSize, string> = {
   sm: "px-2 py-1",
   md: "px-3 py-1",
};

interface ButtonLook {
   variant?: ButtonVariant;
   size?: ButtonSize;
}

/** A button's classes, for links that look like buttons. */
export function buttonStyles({ variant = "secondary", size = "md" }: ButtonLook = {}): string {
   return `rounded text-sm disabled:opacity-50 ${sizes[size]} ${variants[variant]}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook;

export function Button({ variant, size, className, type = "button", ...props }: Props) {
   const classes = [buttonStyles({ variant, size }), className].filter(Boolean).join(" ");
   return <button type={type} className={classes} {...props} />;
}
