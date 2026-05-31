import {
   crypto_box_keypair,
} from "react-native-libsodium";
import { KeyPair } from "./types";

export async function generateKeyPair(): Promise<KeyPair> {
   const result = crypto_box_keypair();

   return {
      publicKey: result.publicKey,
      privateKey: result.privateKey,
   };
}