/**
 * The user's session on a source is missing or the source no longer accepts it: they need to log in
 * again. Thrown by an adapter's account methods; whatever needs the account handles it.
 */
export class SessionExpiredError extends Error {
   constructor(readonly source: string) {
      super(`Not logged in to ${source}: run \`pnpm login ${source}\` in apps/worker`);
   }
}

/**
 * The source offers no application form on this job: applied already, the job is closed, or the
 * profile doesn't meet its requirements. The message says which, for the user to read.
 */
export class CannotApplyError extends Error {
   constructor(
      readonly source: string,
      reason: string,
   ) {
      super(reason);
   }
}
