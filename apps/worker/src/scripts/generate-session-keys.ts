// Generates the key pair that encrypts the users' sessions in the database (see encryptSession).
// Usage: pnpm session-keys:generate, once for each place the app runs; both go into its .env, the
// private one never committed.
// A new pair makes the sessions already in the database unreadable: everyone logs in again.
import { generateSessionKeys } from "@jobpilot/session-crypto";

const { publicKey, privateKey } = await generateSessionKeys();
console.log(`SESSION_PUBLIC_KEY=${publicKey}\nSESSION_PRIVATE_KEY=${privateKey}`);
