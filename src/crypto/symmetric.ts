import { randomBytes } from "@noble/hashes/utils.js";
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { Buffer } from "buffer";
import { EncryptedData, KeyPair } from "./types";

export function toBase64(
   bytes: Uint8Array,
): string {
   return Buffer
      .from(bytes)
      .toString("base64");
}

export function fromBase64(
   value: string,
): Uint8Array {
   return new Uint8Array(
      Buffer.from(value, "base64"),
   );
}

export function encryptWithMasterKey(data: KeyPair, masterKey: Uint8Array): EncryptedData {
   const nonce = randomBytes(24);

   const cipher = xchacha20poly1305(
      masterKey,
      nonce,
   );

   const privateKeyEncrypted = cipher.encrypt(data.privateKey);
   const publicKeyEncrypted = cipher.encrypt(data.publicKey);

   const resultPrivate = new Uint8Array(
      nonce.length + privateKeyEncrypted.length,
   );
   resultPrivate.set(nonce);
   resultPrivate.set(privateKeyEncrypted, nonce.length);

   const resultPublic = new Uint8Array(
      nonce.length + publicKeyEncrypted.length,
   );
   resultPublic.set(nonce);
   resultPublic.set(publicKeyEncrypted, nonce.length);

   return {
      privateKeyEncrypted: toBase64(resultPrivate),
      publicKeyEncrypted: toBase64(resultPublic),
   };
}

export function decryptWithMasterKey(encryptedData: EncryptedData, masterKey: Uint8Array): KeyPair {
   const privateKeyBytes = fromBase64(encryptedData.privateKeyEncrypted);
   const publicKeyBytes = fromBase64(encryptedData.publicKeyEncrypted);

   const noncePrivate = privateKeyBytes.slice(0, 24);
   const noncePublic = publicKeyBytes.slice(0, 24);

   const cipherPrivate = xchacha20poly1305(
      masterKey,
      noncePrivate,
   );

   const cipherPublic = xchacha20poly1305(
      masterKey,
      noncePublic,
   );

   const privateKeyDecrypted = cipherPrivate.decrypt(privateKeyBytes.slice(24));
   const publicKeyDecrypted = cipherPublic.decrypt(publicKeyBytes.slice(24));

   return {
      privateKey: privateKeyDecrypted,
      publicKey: publicKeyDecrypted,
   };
}