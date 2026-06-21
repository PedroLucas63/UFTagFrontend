import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceResponse } from '../api/devices';
import { getPassword } from './tokenStorage';
import { deriveKey } from '../crypto/kdf';
import { Buffer } from 'buffer';
import { decryptWithMasterKey } from '../crypto/symmetric';

const DEVICE_KEY = 'device';
const PUBLIC_KEY = 'publicKey';
const PRIVATE_KEY = 'privateKey';

// Constantes do AsyncStorage
const CACHE_DEVICES_KEY = '@devices_data';
const CACHE_SYNC_TIME_KEY = '@devices_last_sync';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutos em milissegundos

// Tipagens do estado local
export interface LocalDeviceState {
   battery: number | null;      // null = "-"
   rssi: string;        // "-" quando desconhecido
   isNear: boolean;
   locationLat: number | null;
   locationLng: number | null;
   locationText: string;        // "-" quando desconhecido
   lastUpdate: string | null;
}

export interface LocalDevice extends LocalDeviceState {
   id: string;
   name: string;
}

export function createLocalDevice(deviceResponse: DeviceResponse): LocalDevice {
   return {
      id: deviceResponse.id,
      name: deviceResponse.name,
      battery: null,
      rssi: "-",
      isNear: false,
      locationLat: null,
      locationLng: null,
      locationText: "-",
      lastUpdate: null,
   };
}

/**
 * Salva as chaves no Keychain e os metadados básicos no AsyncStorage.
 */
export async function saveDevices(devices: DeviceResponse[]) {
   const pass = await getPassword();

   if (!pass) {
      throw new Error('No password found');
   }

   // Recupera o cache atual para não perder os dados de bateria/localização 
   // que já estavam salvos no celular ao atualizar a lista da API
   const existingCacheStr = await AsyncStorage.getItem(CACHE_DEVICES_KEY);
   const localCache: Record<string, LocalDevice> = existingCacheStr ? JSON.parse(existingCacheStr) : {};

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
      );

      const publicKey = Buffer.from(keyPair.publicKey).toString("base64");
      const privateKey = Buffer.from(keyPair.privateKey).toString("base64");

      // CORREÇÃO MANTIDA: 'service' deve incluir o ID para não sobrescrever chaves!
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

      // Atualiza o cache local com os metadados da API preservando o estado dinâmico (sensores)
      localCache[device.id] = {
         id: device.id,
         name: device.name,
         battery: localCache[device.id]?.battery ?? null,
         rssi: localCache[device.id]?.rssi ?? "-",
         isNear: localCache[device.id]?.isNear ?? false,
         locationLat: localCache[device.id]?.locationLat ?? null,
         locationLng: localCache[device.id]?.locationLng ?? null,
         locationText: localCache[device.id]?.locationText ?? "-",
         lastUpdate: localCache[device.id]?.lastUpdate ?? null,
      };
   }

   // Salva o novo cache e o momento exato da sincronização
   await AsyncStorage.setItem(CACHE_DEVICES_KEY, JSON.stringify(localCache));
   await AsyncStorage.setItem(CACHE_SYNC_TIME_KEY, Date.now().toString());
}

export async function getAllPublicKey(): Promise<Map<string, string>> {
   const { devices, needsBackgroundSync } = await getLocalDevices();
   var publicKeys = new Map<string, string>();

   for (var device of devices) {
      const defaultKey = `${DEVICE_KEY}.${device.id}`;
      var publicKey = await Keychain.getGenericPassword({
         service: `${defaultKey}.${PUBLIC_KEY}`,
         authenticationPrompt: {
            title: 'Authenticate to access device keys',
         },
      });

      if (publicKey)
         publicKeys.set(device.id, publicKey.password);
   }

   return publicKeys;
}

/**
 * Recupera as chaves criptográficas de um dispositivo específico.
 */
export async function getDeviceKeys(deviceId: string) {
   const defaultKey = `${DEVICE_KEY}.${deviceId}`;

   const publicKeyEntry = await Keychain.getGenericPassword({
      service: `${defaultKey}.${PUBLIC_KEY}`,
      authenticationPrompt: {
         title: 'Authenticate to access device keys',
      },
   });

   const privateKeyEntry = await Keychain.getGenericPassword({
      service: `${defaultKey}.${PRIVATE_KEY}`,
      authenticationPrompt: {
         title: 'Authenticate to access device keys',
      },
   });

   if (!publicKeyEntry || !privateKeyEntry) {
      throw new Error('Device keys not found');
   }

   return {
      publicKey: publicKeyEntry.password,
      privateKey: privateKeyEntry.password,
   };
}

export async function getDeviceByPublicKey(publicKey: string): Promise<LocalDevice | null> {
   const { devices, needsBackgroundSync } = await getLocalDevices();

   for (var device of devices) {
      const defaultKey = `${DEVICE_KEY}.${device.id}`;
      var currentPublicKey = await Keychain.getGenericPassword({
         service: `${defaultKey}.${PUBLIC_KEY}`,
         authenticationPrompt: {
            title: 'Authenticate to access device keys',
         },
      });

      if (currentPublicKey && currentPublicKey.password === publicKey) {
         return device;
      }
   }

   return null;
}

/**
 * Retorna os dispositivos salvos em cache imediatamente e indica se 
 * é necessário fazer um fetch silencioso (background) na API.
 */
export async function getLocalDevices(): Promise<{ devices: LocalDevice[], needsBackgroundSync: boolean }> {
   const [cacheStr, syncTimeStr] = await Promise.all([
      AsyncStorage.getItem(CACHE_DEVICES_KEY),
      AsyncStorage.getItem(CACHE_SYNC_TIME_KEY)
   ]);

   const devicesDict: Record<string, LocalDevice> = cacheStr ? JSON.parse(cacheStr) : {};
   const devices = Object.values(devicesDict);

   const lastSyncTime = syncTimeStr ? parseInt(syncTimeStr, 10) : 0;
   const timeSinceLastSync = Date.now() - lastSyncTime;

   // Se passou de 10 minutos (ou se nunca sincronizou), avisa a UI para atualizar no fundo
   const needsBackgroundSync = timeSinceLastSync > CACHE_DURATION_MS;

   return { devices, needsBackgroundSync };
}

/**
 * Atualiza apenas os dados dinâmicos de uma Tag (bateria, localização, presença).
 * Ideal para ser chamado após processar um payload Bluetooth ou GPS.
 */
export async function updateDeviceState(deviceId: string, updates: Partial<LocalDeviceState>) {
   const cacheStr = await AsyncStorage.getItem(CACHE_DEVICES_KEY);
   if (!cacheStr) return;

   const localCache: Record<string, LocalDevice> = JSON.parse(cacheStr);

   if (localCache[deviceId]) {
      localCache[deviceId] = {
         ...localCache[deviceId],
         ...updates,
         lastUpdate: new Date().toISOString() // Registra automaticamente a hora da mudança
      };

      await AsyncStorage.setItem(CACHE_DEVICES_KEY, JSON.stringify(localCache));
   }
}