export function log(scope: string, message: string) {
   console.log(`${new Date().toISOString()} [${scope}] ${message}`);
}
