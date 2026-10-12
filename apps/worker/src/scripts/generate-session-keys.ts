// Generates the key pair that encrypts the users' sessions in the database (see encryptSession).
// Usage: pnpm session-keys:generate, once. The public key goes into SESSION_PUBLIC_KEY in config.ts:
// committed, everyone's login encrypts with it. The private one goes into the server's .env only.
// A new pair makes the sessions already in the database unreadable: everyone logs in again.
import { generateSessionKeys } from "@jobpilot/sources";

const { publicKey, privateKey } = await generateSessionKeys();
console.log(`SESSION_PUBLIC_KEY in apps/worker/src/config.ts:\n${publicKey}\n`);
console.log(`In the server's .env only, never commit it:\nSESSION_PRIVATE_KEY=${privateKey}`);
