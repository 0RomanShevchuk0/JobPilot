import sodium from "libsodium-wrappers";

/*
 * Sessions in the database, readable by the worker only: the API encrypts them with the public key,
 * only the worker's private key decrypts one. libsodium's sealed box does it all in one call. Keys are
 * base64, both in .env: a pair of its own for each place the app runs.
 */

export interface SessionKeys {
   publicKey: string;
   privateKey: string;
}

const toBase64 = (bytes: Uint8Array) => sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
const fromBase64 = (text: string) => sodium.from_base64(text, sodium.base64_variants.ORIGINAL);

/** A new key pair, for SESSION_PUBLIC_KEY and SESSION_PRIVATE_KEY in .env. */
export async function generateSessionKeys(): Promise<SessionKeys> {
   await sodium.ready;
   const { publicKey, privateKey } = sodium.crypto_box_keypair();
   return { publicKey: toBase64(publicKey), privateKey: toBase64(privateKey) };
}

/** The session, readable with the private key only. */
export async function encryptSession(session: string, publicKey: string): Promise<string> {
   await sodium.ready;
   const publicKeyBytes = fromBase64(publicKey);
   return toBase64(sodium.crypto_box_seal(session, publicKeyBytes));
}

/** The session encryptSession encrypted; throws on another key's encryption or a changed one. */
export async function decryptSession(encrypted: string, keys: SessionKeys): Promise<string> {
   await sodium.ready;
   const encryptedBytes = fromBase64(encrypted);
   const publicKey = fromBase64(keys.publicKey);
   const privateKey = fromBase64(keys.privateKey);
   const session = sodium.crypto_box_seal_open(encryptedBytes, publicKey, privateKey);
   return sodium.to_string(session);
}
