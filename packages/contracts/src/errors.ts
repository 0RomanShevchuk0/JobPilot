/**
 * The user's session on a source is missing or the source no longer accepts it: they need to log in
 * again. Thrown by an adapter's account methods; whatever needs the account handles it.
 */
export class SessionExpiredError extends Error {
   constructor(readonly source: string) {
      super(`Not logged in to ${source}: run \`pnpm login ${source}\` in apps/worker`);
   }
}
