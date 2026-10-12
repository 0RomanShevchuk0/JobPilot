import { describe, expect, it } from "vitest";
import { decryptSession, encryptSession, generateSessionKeys } from "./encrypted-session.js";

const keys = await generateSessionKeys();
const session = JSON.stringify({ cookies: [{ name: "sessionid", value: "secret" }], origins: [] });

describe("encryptSession", () => {
   it("is decrypted by the private key", async () => {
      const encrypted = await encryptSession(session, keys.publicKey);
      expect(encrypted).not.toContain("secret");
      expect(await decryptSession(encrypted, keys)).toBe(session);
   });

   it("can't be decrypted by another key", async () => {
      const encrypted = await encryptSession(session, keys.publicKey);
      const other = await generateSessionKeys();
      await expect(decryptSession(encrypted, other)).rejects.toThrow();
   });

   it("can't be decrypted once changed", async () => {
      const encrypted = Buffer.from(await encryptSession(session, keys.publicKey), "base64");
      encrypted[encrypted.length - 1]! ^= 1;
      const changed = encrypted.toString("base64");
      await expect(decryptSession(changed, keys)).rejects.toThrow();
   });
});
