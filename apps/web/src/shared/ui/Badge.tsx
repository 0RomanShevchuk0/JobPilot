import type { ReactNode } from "react";

export type BadgeSize = "sm" | "md";

const sizes: Record<BadgeSize, string> = {
   sm: "px-2 py-0.5 text-xs",
   md: "px-2 py-1 text-sm",
};

interface Props {
   /** background and text color classes; a feature's own map decides them, e.g. by status */
   tone?: string;
   size?: BadgeSize;
   className?: string;
   children: ReactNode;
}

/** A short colored label: a verdict, a status, a job site. */
export function Badge({
   tone = "bg-gray-100 text-gray-600",
   size = "sm",
   className,
   children,
}: Props) {
   const classes = ["shrink-0 rounded font-medium", sizes[size], tone, className]
      .filter(Boolean)
      .join(" ");
   return <span className={classes}>{children}</span>;
}
