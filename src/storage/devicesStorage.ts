import * as Keychain from 'react-native-keychain';
import { DeviceResponse } from '../api/devices';
import { getPassword } from './tokenStorage';
import { deriveKey } from '../crypto/kdf';
import { Buffer } from 'buffer';
import { decryptWithMasterKey } from '../crypto/symmetric';

const DEVICE_KEY = 'device';
const PUBLIC_KEY = 'publicKey';
const PRIVATE_KEY = 'privateKey';

export async function saveDevices(devices: DeviceResponse[]) {
   const pass = await getPassword();

   if (!pass) {
      throw new Error('No password found');
   }

   for (const device of devices) {
      const defaultKey = `${DEVICE_KEY}.${device.Id}`;
      const keysSalt = new Uint8Array(
         Buffer.from(device.KeysSalt, "base64")
      );

      const masterKey = await deriveKey(pass, keysSalt);
      const keyPair = decryptWithMasterKey(
         {
            publicKeyEncrypted: device.EncryptedPublicKey,
            privateKeyEncrypted: device.EncryptedPrivateKey,
         },
         masterKey,
      )

      const publicKey = Buffer.from(keyPair.publicKey).toString("base64");
      const privateKey = Buffer.from(keyPair.privateKey).toString("base64");

      await Keychain.setGenericPassword(
         `${defaultKey}.${PUBLIC_KEY}`,
         publicKey,
         {
            service: PUBLIC_KEY,
         }
      );
      await Keychain.setGenericPassword(
         `${defaultKey}.${PRIVATE_KEY}`,
         privateKey,
         {
            service: PRIVATE_KEY,
         }
      );
   }
}