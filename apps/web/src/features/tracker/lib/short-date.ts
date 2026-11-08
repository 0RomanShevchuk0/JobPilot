/** "7 Nov", with the year only when it isn't this one's. */
export function shortDate(iso: string): string {
   const date = new Date(iso);
   const thisYear = date.getFullYear() === new Date().getFullYear();
   return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: thisYear ? undefined : "numeric",
   });
}
