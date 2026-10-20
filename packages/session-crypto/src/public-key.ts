/**
 * The server's public key for the sessions in the database: everyone who saves a session (the API, for
 * the extension; `pnpm login:<source>`) encrypts with it, only the server's SESSION_PRIVATE_KEY decrypts.
 * Not a secret; from `pnpm session-keys:generate`.
 */
export const SESSION_PUBLIC_KEY = "fiej5RPyJ3Z29X/8+ZMQ3qylZ7yv6JTb0ZC0M1XOPSI=";
