import { randomBytes } from "@noble/hashes/utils.js";
import { argon2idAsync } from "@noble/hashes/argon2.js";

const KEY_LENGTH = 32;

export function generateSalt(): Uint8Array {
   return randomBytes(32);
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
   return await argon2idAsync(
      password,
      salt,
      {
         dkLen: KEY_LENGTH,
         t: 3,
         m: 2 ** 16,
         p: 1,
      }
   );
}