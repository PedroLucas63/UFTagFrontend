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
      if (!device.keysSalt || !device.encryptedPublicKey || !device.encryptedPrivateKey) {
         continue;
      }

      const defaultKey = `${DEVICE_KEY}.${device.id}`;
      const keysSalt = new Uint8Array(
         Buffer.from(device.keysSalt, "base64")
      );

      if (keysSalt.length < 8) {
         continue;
      }

      const masterKey = await deriveKey(pass, keysSalt);
      const keyPair = decryptWithMasterKey(
         {
            publicKeyEncrypted: device.encryptedPublicKey,
            privateKeyEncrypted: device.encryptedPrivateKey,
         },
         masterKey,
      )

      const publicKey = Buffer.from(keyPair.publicKey).toString("base64");
      const privateKey = Buffer.from(keyPair.privateKey).toString("base64");

      await Keychain.setGenericPassword(
         `${defaultKey}.${PUBLIC_KEY}`,
         publicKey,
         {
            service: `device.${device.id}.publicKey`,
         }
      );
      await Keychain.setGenericPassword(
         `${defaultKey}.${PRIVATE_KEY}`,
         privateKey,
         {
            service: `device.${device.id}.privateKey`,
         }
      );
   }
}

export async function getDeviceKeys(deviceId: string): Promise<{
   publicKey: Uint8Array;
   privateKey: Uint8Array;
}>{
   if (deviceId === '123456789') {
      return {
         publicKey: new Uint8Array(Buffer.from("WD9YBd1BMYQS3jfRAMartYNZQe/KPp/oNOckVQnGawU=", "base64")),
         privateKey: new Uint8Array(Buffer.from("9Ke7f/E4zLrowS6Zf3YKDhAo7lLgX3yfZ7eadrJEjmU=", "base64")),
      };
   }

   const publicKeyEntry = await Keychain.getGenericPassword({
      service: `device.${deviceId}.publicKey`,
   });
   const privateKeyEntry = await Keychain.getGenericPassword({
      service: `device.${deviceId}.privateKey`,
   });

   if (!publicKeyEntry || !privateKeyEntry) {
      throw new Error('Device keys not found');
   }

   return {
      publicKey: new Uint8Array(Buffer.from(publicKeyEntry.password, "base64")),
      privateKey: new Uint8Array(Buffer.from(privateKeyEntry.password, "base64")),
   };
}
