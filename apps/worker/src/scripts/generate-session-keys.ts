// Generates the key pair that encrypts the users' sessions in the database (see encryptSession).
// Usage: pnpm session-keys:generate, once. The public key goes into SESSION_PUBLIC_KEY in
// packages/session-crypto/src/public-key.ts: committed, every saved session is encrypted with it.
// The private one goes into the server's .env only.
// A new pair makes the sessions already in the database unreadable: everyone logs in again.
import { generateSessionKeys } from "@jobpilot/session-crypto";

const { publicKey, privateKey } = await generateSessionKeys();
console.log(`SESSION_PUBLIC_KEY in packages/session-crypto/src/public-key.ts:\n${publicKey}\n`);
console.log(`In the server's .env only, never commit it:\nSESSION_PRIVATE_KEY=${privateKey}`);
