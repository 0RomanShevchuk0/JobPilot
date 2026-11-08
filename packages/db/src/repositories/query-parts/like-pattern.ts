/** An ILIKE pattern for "holds this text anywhere": % and _ in the text are literal. */
export function likeContainsPattern(text: string): string {
   // escapes LIKE's wildcards and its escape char: 50%_off\ → 50\%\_off\\
   return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}
