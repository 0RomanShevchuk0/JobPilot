/** "[scope] 01:33:28 message": the source first to scan by eye, local time without the date. */
export function log(scope: string, message: string) {
   const time = new Date().toTimeString().slice(0, 8);
   console.log(`[${scope}] ${time} ${message}`);
}
