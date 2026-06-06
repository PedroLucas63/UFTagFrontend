import { getLocalDevices, getDeviceKeys } from '../storage/devicesStorage';
import { decryptWithPrivateKey } from '../crypto/asymmetric';
import { Buffer } from 'buffer';

export type PublicKeyInfo = { publicKey: string; timestamp: number };

/**
 * Retorna um mapa de deviceId -> lista de chaves públicas e timestamps fictícios.
 */
export async function getNewPublicKeys(): Promise<Record<string, PublicKeyInfo[]>> {
   const { devices } = await getLocalDevices();
   const map: Record<string, PublicKeyInfo[]> = {};

   for (const device of devices) {
      try {
         const keys = await getDeviceKeys(device.id);
         map[device.id] = [
            { publicKey: keys.publicKey, timestamp: Date.now() }
         ];
      } catch (error) {
         console.warn(`Não foi possível recuperar chaves do device ${device.id}`);
      }
   }

   return map;
}

/**
 * Recebe uma lista de chaves públicas + timestamps e retorna um mapa: publicKey -> privateKey.
 * (Como atualmente cada aparelho só tem um par salvo no Keychain, buscamos as chaves locais para parear).
 */
export async function getPrivateKeysMap(
   publicKeysInfo: PublicKeyInfo[]
): Promise<Record<string, string>> {
   const { devices } = await getLocalDevices();
   const privMap: Record<string, string> = {};

   // Cria um mapa rápido de todas as chaves do aparelho para não chamar o Keychain repetidas vezes atoa
   for (const device of devices) {
      try {
         const keys = await getDeviceKeys(device.id);
         privMap[keys.publicKey] = keys.privateKey;
      } catch (e) {
         continue;
      }
   }

   return privMap;
}

/**
 * Faz a engenharia reversa das coordenadas (Reverse Geocoding) usando o Nominatim do OpenStreetMap.
 */
export async function fetchLocationText(lat: number, lng: number): Promise<string> {
   try {
      const response = await fetch(
         `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
         {
            headers: {
               'User-Agent': 'UFTag/1.0',
               'Accept-Language': 'pt-BR'
            }
         }
      );
      const data = await response.json();

      const address = data?.address;
      const name = data?.name;

      if (address?.commercial) return address.commercial;
      return name || "-";
   } catch (error) {
      console.warn("Falha ao buscar texto da localização no OSM", error);
      return "-";
   }
}

/**
 * Decriptografa o payload da API e extrai Lat/Lng
 */
export async function processLocationDecryption(
   locationEncrypted: string,
   publicKeyBase64: string,
   privateKeyBase64: string
): Promise<{ lat: number; lng: number } | null> {
   try {
      const pubBytes = new Uint8Array(Buffer.from(publicKeyBase64, 'base64'));
      const privBytes = new Uint8Array(Buffer.from(privateKeyBase64, 'base64'));

      const decryptedStr = await decryptWithPrivateKey(locationEncrypted, pubBytes, privBytes);
      const [latStr, lngStr] = decryptedStr.split(';');

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (isNaN(lat) || isNaN(lng)) return null;

      return { lat, lng };
   } catch (e) {
      console.warn("Falha na decriptografia de localização", e);
      return null;
   }
}