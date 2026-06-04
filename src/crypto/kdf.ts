import { randomBytes } from "@noble/hashes/utils.js";
import { Buffer } from "buffer";
import Argon2 from 'react-native-argon2'

const KEY_LENGTH = 32;

export function generateSalt(): Uint8Array {
   return randomBytes(32);
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
   const saltString = Buffer.from(salt).toString("base64");

   const result = await Argon2(password, saltString, {
      iterations: 3,
      memory: 65536,
      parallelism: 1,
      mode: "argon2id",
      hashLength: KEY_LENGTH,
   });

   const keyBuffer = Buffer.from(result.rawHash, "hex");
   return new Uint8Array(keyBuffer);
}