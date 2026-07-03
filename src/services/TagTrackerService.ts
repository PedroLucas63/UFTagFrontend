import { locationService } from './LocationService';
import { Buffer } from 'buffer';
import { bleManager } from '../screens/AddTagScreen';
import { getAllPublicKey, updateDeviceState } from '../storage/devicesStorage';
import { LocationReportRequest, reportLocation } from '../api/locations';
import { Device } from 'react-native-ble-plx';
import { encryptWithPublicKey } from '../crypto/asymmetric';

const COMPANY_ID_LO = 0xFF;
const COMPANY_ID_HI = 0xFF;
const UPDATE_THROTTLE_MS = 500; // 500ms
const REPORT_THROTTLE_MS = 30000; // 30s

class TagTrackerService {
   private isScanning = false;
   private lastUpdateMap = new Map<string, number>();
   private knownKeysCache = new Map<string, string>();
   private reportMap = new Map<string, LocationReportRequest>(); // PublicKey: Report
   private locationEncrypted: string | null = null;
   private reportInterval: ReturnType<typeof setInterval> | null = null;

   /**
    * Inicializa o serviço, carrega as chaves para a RAM e começa o scan
    */
   async startBackgroundTracking() {
      if (this.isScanning) return;

      await this.loadKeysToMemory();

      this.isScanning = true;
      console.log('[TagTracker] Iniciando scan global em segundo plano...');

      this.reportInterval = setInterval(async () => {
         if (this.reportMap.size > 0) {
            console.log(`[TagTracker] Enviando ${this.reportMap.size} relatórios de localização...`);
            const entries = Array.from(this.reportMap.entries());

            await Promise.all(
               entries.map(async ([key, report]) => {
                  try {
                     await reportLocation(report);
                     this.reportMap.delete(key);
                  } catch (error) {
                     console.error(`[TagTracker] Erro ao reportar localização para a chave ${key}:`, error);
                  }
               })
            );

            this.locationEncrypted = null;
         }
      }, REPORT_THROTTLE_MS);

      bleManager.startDeviceScan(null, { allowDuplicates: true }, async (error, device) => {
         if (error) {
            console.error("[TagTracker] Erro no scan:", error.message);
            return;
         }

         if (!device || !device.manufacturerData) return;

         const rawData = Buffer.from(device.manufacturerData, 'base64');

         if (rawData.length >= 26 && rawData[0] === COMPANY_ID_LO && rawData[1] === COMPANY_ID_HI) {
            const isLost = rawData[2] === 0x01;

            const part1Buffer = rawData.subarray(3, 26);
            const partialKeyHex = Buffer.from(part1Buffer).toString('base64');

            let fullKey: string | null = null;

            const targetUUID = "0000abff-0000-1000-8000-00805f9b34fb";

            if (device.serviceData && device.serviceData[targetUUID]) {
               const part2Buffer = Buffer.from(device.serviceData[targetUUID], 'base64');

               const fullKeyBuffer = Buffer.concat([part1Buffer, part2Buffer]);
               fullKey = fullKeyBuffer.toString('base64');
            }

            let report: LocationReportRequest;
            if (this.reportMap.has(partialKeyHex)) {
               report = this.reportMap.get(partialKeyHex)!;
            } else {
               if (!fullKey) {
                  console.log(`[TagTracker] Tag detectada sem chave completa. Ignorando...`);
                  return;
               }
               report = await this.createReport(fullKey, device);
            }

            const deviceId = this.knownKeysCache.get(partialKeyHex);

            console.log(`[TagTracker] Dispositivo detectado: ${deviceId}`);
            console.log(`[TagTracker] Key completa: ${fullKey}`);

            if (deviceId) {
               console.log(`[TagTracker] Minha Tag detectada: ${deviceId} (RSSI: ${device.rssi})`);
               this.processFoundTag(deviceId, partialKeyHex, device.rssi, isLost);
               this.reportMap.set(partialKeyHex, report);
            } else if (fullKey) {
               console.log(`[REDE] Tag desconhecida detectada! Chave completa: ${fullKey}`);

               if (isLost) {
                  console.log(`[REDE] Esta Tag está reportada como PERDIDA pelo dono!`);
                  this.reportMap.set(partialKeyHex, report);
               }
            }
         }
      });
   }

   private async createReport(key: string, device: Device): Promise<LocationReportRequest> {
      const now = Date.now();
      const rssi = device.rssi || 0;
      const battery = device.txPowerLevel !== null ? Math.round(device.txPowerLevel * 100) : 0;

      let locationEncrypted: string;
      if (this.locationEncrypted) {
         locationEncrypted = this.locationEncrypted;
      } else {
         const location = locationService.getLastKnownPosition();
         const locationText = `${location?.latitude || 0};${location?.longitude || 0}`;
         locationEncrypted = await encryptWithPublicKey(locationText, Buffer.from(key, 'base64'));
         this.locationEncrypted = locationEncrypted;
      }

      return {
         Key: key,
         LocationEncrypted: locationEncrypted,
         Rssi: rssi,
         Battery: battery,
         Timestamp: now.toString(),
      };
   }

   /**
    * Processa a Tag encontrada com controle de Throttling
    */
   private async processFoundTag(deviceId: string, cacheKey: string, rssi: number | null, isLost: boolean) {
      const now = Date.now();
      const lastUpdate = this.lastUpdateMap.get(cacheKey) || 0;

      // Se faz menos de 500 segundos que atualizamos essa tag, ignoramos este pacote
      if (now - lastUpdate < UPDATE_THROTTLE_MS) return;
      this.lastUpdateMap.set(cacheKey, now);

      console.log(`[TagTracker] Tag conhecida encontrada! Atualizando dados... (Perdida: ${isLost})`);

      const location = locationService.getLastKnownPosition();
      const isNear = rssi ? rssi > -75 : false;

      // Chama a sua função de atualização
      await updateDeviceState(deviceId, {
         rssi: rssi ? rssi.toString() : "-",
         isNear: isNear,
         locationLat: location?.latitude || null,
         locationLng: location?.longitude || null,
         locationText: location ? "Atualizado via GPS" : "-",
      });
   }

   /**
    * Carrega todas as chaves do Keychain para a memória RAM (Executado apenas 1x no boot)
    */
   private async loadKeysToMemory() {
      console.log('[TagTracker] Carregando chaves seguras para a RAM...');
      this.knownKeysCache.clear();
      const tags = await getAllPublicKey();

      for (const [id, publicKey] of tags.entries()) {
         console.log(`[TagTracker] Chave carregada: ${publicKey} (Device ID: ${id})`);
         this.knownKeysCache.set(publicKey, id);
      }

      console.log(`[TagTracker] ${this.knownKeysCache.size} chaves carregadas.`);
   }

   stopTracking() {
      if (this.isScanning) {
         bleManager.stopDeviceScan();
         this.isScanning = false;
         console.log('[TagTracker] Scan global parado.');

         if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
         }
      }
   }
}

export const tagTrackerService = new TagTrackerService();