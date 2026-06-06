import { crypto_box_seal, crypto_box_seal_open } from "react-native-libsodium";
import { Buffer } from "buffer";

export async function encryptWithPublicKey(
   message: string,
   publicKey: Uint8Array,
): Promise<string> {
   const messageBytes = Buffer.from(message, "utf8");
   const cipherBytes = crypto_box_seal(messageBytes, publicKey);

   return Buffer.from(cipherBytes).toString("base64");
}

export async function decryptWithPrivateKey(
   cipherBase64: string,
   publicKey: Uint8Array,
   privateKey: Uint8Array,
): Promise<string> {
   const cipherBytes = Buffer.from(cipherBase64, "base64");

   const plainBytes = crypto_box_seal_open(
      cipherBytes, publicKey, privateKey
   );

   return Buffer.from(plainBytes).toString("utf8");
}