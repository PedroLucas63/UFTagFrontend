import { crypto_box_seal, crypto_box_seal_open } from "react-native-libsodium";
import { Buffer } from "buffer";

export async function encryptWithPublicKey(
   message: string,
   publicKey: Uint8Array,
): Promise<string> {
   const messageBytes = new Uint8Array(
      Buffer.from(message, "base64"),
   );

   const cipherBytes = crypto_box_seal(messageBytes, publicKey);

   return Buffer.from(cipherBytes).toString("base64");
}

export async function decryptWithPrivateKey(
   cipherBase64: string,
   publicKey: Uint8Array,
   privateKey: Uint8Array,
): Promise<string> {
   const cipherBytes = new Uint8Array(
      Buffer.from(cipherBase64, "base64")
   );
   const plainBytes = crypto_box_seal_open(
      cipherBytes, publicKey, privateKey
   );

   return Buffer.from(plainBytes).toString("utf8");
}