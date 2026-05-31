export interface EncryptedData {
   publicKeyEncrypted: string;
   privateKeyEncrypted: string;
}

export interface KeyPair {
   publicKey: Uint8Array;
   privateKey: Uint8Array;
}