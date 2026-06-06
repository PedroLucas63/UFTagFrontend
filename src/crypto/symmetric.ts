import { randomBytes } from "@noble/hashes/utils.js";
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { Buffer } from "buffer";
import { EncryptedData, KeyPair } from "./types";

export function toBase64(bytes: Uint8Array): string {
   return Buffer.from(bytes).toString("base64");
}

export function fromBase64(value: string): Uint8Array {
   return Buffer.from(value, "base64");
}

export function encryptWithMasterKey(data: KeyPair, masterKey: Uint8Array): EncryptedData {
   const noncePrivate = randomBytes(24);
   const noncePublic = randomBytes(24);

   const cipherPrivate = xchacha20poly1305(masterKey, noncePrivate);
   const cipherPublic = xchacha20poly1305(masterKey, noncePublic);

   const privateKeyEncrypted = cipherPrivate.encrypt(data.privateKey);
   const publicKeyEncrypted = cipherPublic.encrypt(data.publicKey);

   const resultPrivate = Buffer.concat([noncePrivate, privateKeyEncrypted]);
   const resultPublic = Buffer.concat([noncePublic, publicKeyEncrypted]);

   return {
      privateKeyEncrypted: toBase64(resultPrivate),
      publicKeyEncrypted: toBase64(resultPublic),
   };
}

export function decryptWithMasterKey(encryptedData: EncryptedData, masterKey: Uint8Array): KeyPair {
   const privateKeyBytes = fromBase64(encryptedData.privateKeyEncrypted);
   const publicKeyBytes = fromBase64(encryptedData.publicKeyEncrypted);

   const noncePrivate = privateKeyBytes.subarray(0, 24);
   const noncePublic = publicKeyBytes.subarray(0, 24);

   const cipherPrivate = xchacha20poly1305(masterKey, noncePrivate);
   const cipherPublic = xchacha20poly1305(masterKey, noncePublic);

   const privateKeyDecrypted = cipherPrivate.decrypt(privateKeyBytes.subarray(24));
   const publicKeyDecrypted = cipherPublic.decrypt(publicKeyBytes.subarray(24));

   return {
      privateKey: privateKeyDecrypted,
      publicKey: publicKeyDecrypted,
   };
}