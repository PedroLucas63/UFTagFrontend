import { locationService } from './LocationService';
import { Buffer } from 'buffer';
import { bleManager } from './BleManager';
import { getAllPublicKey, updateDeviceState } from '../storage/devicesStorage';
import { LocationReportRequest, reportLocation } from '../api/locations';
import { Device } from 'react-native-ble-plx';
import { encryptWithPublicKey } from '../crypto/asymmetric';
import { fetchLocationText } from '../utils/locationUtils';

const COMPANY_ID_LO = 0xFF;
const COMPANY_ID_HI = 0xFF;
const UPDATE_THROTTLE_MS = 500;   // ms entre updates da mesma tag
const REPORT_THROTTLE_MS = 5000; // ms entre envios de relatório para a API

// UUID do serviceData que identifica um pacote UFTag
const TARGET_RESPONSE_UUID = "0000abff-0000-1000-8000-00805f9b34fb";

const UFTAG_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const UFTAG_CHAR_ID_UUID = "0000fff3-0000-1000-8000-00805f9b34fb";

// Layout do manufacturer data:
//   [0..1] = Company ID (0xFF 0xFF)
//   [2]    = isLost flag (0x01 = perdida)
//   [3..25] = primeiros 23 bytes da chave pública Curve25519
//   serviceData[TARGET_RESPONSE_UUID] = últimos 9 bytes da chave → total 32
const PART1_OFFSET = 3;
const PART1_LEN = 23;          // bytes[3..25]
const PART1_END = PART1_OFFSET + PART1_LEN; // = 26

class TagTrackerService {
   private isScanning = false;

   // Throttle de updates da própria tag
   private lastUpdateMap = new Map<string, number>();
   private partialKeyToDeviceId = new Map<string, string>();
   private fullKeyToDeviceId = new Map<string, string>();
   private reportMap = new Map<string, LocationReportRequest>();

   private reportInterval: ReturnType<typeof setInterval> | null = null;

   // Contadores de pacotes para diagnóstico
   private pktTotal = 0;
   private pktUftag = 0;
   private pktOwn = 0;
   private pktLost = 0;

   private lastKeepAliveMap = new Map<string, number>();
   private isConnectingMap = new Map<string, boolean>();

   // ─── API pública ──────────────────────────────────────────────────────────

   async startBackgroundTracking() {
      if (this.isScanning) {
         return;
      }

      // 1) Carrega chaves para RAM
      await this.loadKeysToMemory();

      // 2) Verifica se há GPS disponível
      const pos = locationService.getLastKnownPosition();
      if (!pos) {
         console.warn('[TagTracker] GPS: nenhuma posição conhecida ainda. Reports usarão 0;0 até o GPS fixar.');
      }

      this.isScanning = true;

      // 3) Timer de envio de relatórios (a cada 30s)
      this.reportInterval = setInterval(async () => {
         await this.flushReports();
      }, REPORT_THROTTLE_MS);

      // 4) Inicia scan BLE
      bleManager.startDeviceScan(
         null, // null = escaneia todos os dispositivos BLE
         { allowDuplicates: true },
         async (error, device) => {
            if (error) {
               console.error(`[BLE]  Erro no scan:`, error.message, `| código: ${error.errorCode}`);
               this.isScanning = false;
               if (this.reportInterval) {
                  clearInterval(this.reportInterval);
                  this.reportInterval = null;
               }
               return;
            }

            if (!device) return;

            this.pktTotal++;

            if (!device.manufacturerData) {
               return;
            }

            await this.processDevice(device);
         }
      );
   }

   stopTracking() {
      if (this.isScanning) {
         bleManager.stopDeviceScan();
         this.isScanning = false;
         if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
         }
      }
   }

   // ─── Processamento de pacote BLE ──────────────────────────────────────────

   private async processDevice(device: Device) {
      try {
         const rawData = Buffer.from(device.manufacturerData!, 'base64');

         if (rawData.length < PART1_END) {
            return;
         }

         const cmpLo = rawData[0];
         const cmpHi = rawData[1];
         if (cmpLo !== COMPANY_ID_LO || cmpHi !== COMPANY_ID_HI) {
            return;
         }

         this.pktUftag++;
         const isLost = rawData[2] === 0x01;

         // Extrai parte 1 da chave (23 bytes do manufacturer data)
         const part1Buffer = rawData.subarray(PART1_OFFSET, PART1_END);
         const partialKeyBase64 = Buffer.from(part1Buffer).toString('base64');

         // Extrai parte 2 da chave (serviceData → 9 bytes)
         let fullKey: string | null = null;
         let fullKeyBuffer: Buffer | null = null;

         const hasServiceData = !!(device.serviceData && device.serviceData[TARGET_RESPONSE_UUID]);
         if (hasServiceData) {
            const part2Buffer = Buffer.from(device.serviceData![TARGET_RESPONSE_UUID], 'base64');
            fullKeyBuffer = Buffer.concat([part1Buffer, part2Buffer]);
            fullKey = fullKeyBuffer.toString('base64');
         }

         // Reconhecimento de posse
         const myDeviceIdByPartial = this.partialKeyToDeviceId.get(partialKeyBase64);
         const myDeviceIdByFull = fullKey ? this.fullKeyToDeviceId.get(fullKey) : undefined;
         const myDeviceId = myDeviceIdByPartial ?? myDeviceIdByFull;

         if (myDeviceId) {
            // TAG DO PRÓPRIO USUÁRIO
            this.pktOwn++;
            console.log(`[TagTracker] Tag própria detectada: ID ${myDeviceId} | RSSI: ${device.rssi} | Modo Perdido: ${isLost ? 'SIM' : 'NÃO'}`);
            
            await this.processFoundTag(myDeviceId, partialKeyBase64, device.rssi, isLost);

            if (fullKey && fullKeyBuffer) {
               await this.queueLocationReport(partialKeyBase64, fullKey, fullKeyBuffer, device, /* isOwner */ true);
            } else {
               console.warn(`[TagTracker] Chave completa de tag própria ausente (sem serviceData). Não foi possível enfileirar o reporte para API.`);
            }

            // Mantém a tag atualizada (keep-alive) conectando periodicamente
            this.sendKeepAlive(device, isLost);

         } else {
            // TAG DE TERCEIRO
            if (!fullKey || !fullKeyBuffer) {
               console.log(`[TagTracker] Tag de terceiro avistada (RSSI: ${device.rssi}), mas descartada: chave incompleta (serviceData ausente)`);
               return;
            }

            if (isLost) {
               this.pktLost++;
               console.log(`[TagTracker] Tag de terceiro PERDIDA avistada (RSSI: ${device.rssi}). Enfileirando reporte de localização...`);
               await this.queueLocationReport(partialKeyBase64, fullKey, fullKeyBuffer, device, /* isOwner */ false);
            } else {
               // Muito importante para depuração: tag de terceiro ignorada porque não está perdida
               console.log(`[TagTracker] ⚪ Tag de terceiro avistada (RSSI: ${device.rssi}), mas ignorada: NÃO está em modo perdido.`);
            }
         }

      } catch (err) {
         console.error(`[TagTracker] Erro ao processar pacote BLE:`, err);
      }
   }

   // ─── Enfileiramento de relatório de localização ───────────────────────────

   private async queueLocationReport(
      partialKeyBase64: string,
      fullKey: string,
      fullKeyBuffer: Buffer,
      device: Device,
      isOwner: boolean,
   ) {
      try {
         const location = locationService.getLastKnownPosition();
         const lat = location?.latitude ?? 0;
         const lng = location?.longitude ?? 0;
         const locationStr = `${lat};${lng}`;

         const locationEncrypted = await encryptWithPublicKey(locationStr, fullKeyBuffer);

         const report: LocationReportRequest = {
            Key: fullKey,
            LocationEncrypted: locationEncrypted,
            Rssi: device.rssi ?? 0,
            Battery: device.txPowerLevel !== null && device.txPowerLevel !== undefined
               ? Math.max(0, Math.min(100, Math.round(device.txPowerLevel * 100)))
               : 0,
            Timestamp: new Date().toISOString(),
         };

         this.reportMap.set(partialKeyBase64, report);

      } catch (err) {
         console.error(`[TagTracker] Erro ao cifrar/enfileirar relatório:`, err);
      }
   }

   // ─── Processamento da tag do próprio usuário ──────────────────────────────

   private async processFoundTag(
      deviceId: string,
      cacheKey: string,
      rssi: number | null,
      isLost: boolean,
   ) {
      const now = Date.now();
      const lastUpdate = this.lastUpdateMap.get(cacheKey) ?? 0;

      if (now - lastUpdate < UPDATE_THROTTLE_MS) {
         return;
      }
      this.lastUpdateMap.set(cacheKey, now);

      const location = locationService.getLastKnownPosition();
      const isNear = rssi !== null ? rssi > -75 : false;

      let locationText = '-';
      if (location) {
         try {
            locationText = await fetchLocationText(location.latitude, location.longitude);
         } catch (err) {
            console.warn("[TagTracker] Falha ao converter coordenadas em endereço:", err);
            locationText = 'Atualizado via GPS';
         }
      }

      await updateDeviceState(deviceId, {
         rssi: rssi !== null ? rssi.toString() : '-',
         isNear,
         locationLat: location?.latitude ?? null,
         locationLng: location?.longitude ?? null,
         locationText: locationText,
      });
   }

   // ─── Carga das chaves do Keychain para RAM ────────────────────────────────

   private async loadKeysToMemory() {
      this.partialKeyToDeviceId.clear();
      this.fullKeyToDeviceId.clear();

      let tags: Map<string, string>;
      try {
         tags = await getAllPublicKey();
      } catch (err) {
         console.error(`[KEYS] Falha ao chamar getAllPublicKey():`, err);
         return;
      }

      if (tags.size === 0) {
         console.warn(`[KEYS] Nenhuma chave pública encontrada no Keychain!`);
         return;
      }

      for (const [deviceId, publicKeyBase64] of tags.entries()) {
         const fullKeyBytes = Buffer.from(publicKeyBase64, 'base64');

         if (fullKeyBytes.length < PART1_LEN) {
            console.warn(`[KEYS]  Chave muito curta (${fullKeyBytes.length} bytes) — ignorada`);
            continue;
         }

         this.fullKeyToDeviceId.set(publicKeyBase64, deviceId);

         const partialBytes = fullKeyBytes.subarray(0, PART1_LEN);
         const partialBase64 = Buffer.from(partialBytes).toString('base64');
         this.partialKeyToDeviceId.set(partialBase64, deviceId);
      }
   }

   // ─── Envio dos relatórios pendentes ──────────────────────────────────────

   private async flushReports() {
      if (this.reportMap.size === 0) {
         return;
      }

      const entries = Array.from(this.reportMap.entries());

      await Promise.all(
         entries.map(async ([partialKey, report]) => {
            try {
               const res = await reportLocation(report);
               if (res.ok) {
                  this.reportMap.delete(partialKey);
                  console.log(`[TagTracker] Relatório de localização enviado com sucesso para a chave: ${partialKey.substring(0, 10)}...`);
               } else {
                  console.warn(`[TagTracker] Falha ao enviar relatório (API rejeitou):`, res.error);
               }
            } catch (error) {
               console.error(`[TagTracker] Erro inesperado ao enviar relatório:`, error);
            }
         })
      );
   }

   private async sendKeepAlive(device: Device, isLost: boolean) {
      const now = Date.now();
      const lastKeepAlive = this.lastKeepAliveMap.get(device.id) ?? 0;

      const intervalLimit = 20000;

      if (now - lastKeepAlive < intervalLimit) {
         return;
      }

      // Evita conexões simultâneas para o mesmo dispositivo
      if (this.isConnectingMap.get(device.id)) {
         return;
      }
      this.isConnectingMap.set(device.id, true);
      this.lastKeepAliveMap.set(device.id, now);

      console.log(`[KeepAlive] 🔄 Iniciando conexão com a tag ${device.id} (Modo Perdido: ${isLost ? 'SIM' : 'NAO'})...`);
      try {
         const connected = await device.connect();
         await connected.discoverAllServicesAndCharacteristics();

         // Lê característica segura para disparar o bonding/encriptação
         await connected.readCharacteristicForService(
            UFTAG_SERVICE_UUID,
            UFTAG_CHAR_ID_UUID
         );

         console.log(`[KeepAlive] Heartbeat enviado com sucesso para ${device.id}`);
         await connected.cancelConnection();
      } catch (err) {
         console.warn(`[KeepAlive] Falha ao enviar keep-alive para ${device.id}:`, err);
      } finally {
         this.isConnectingMap.set(device.id, false);
      }
   }

   clearState() {
      this.stopTracking();
      this.partialKeyToDeviceId.clear();
      this.fullKeyToDeviceId.clear();
      this.isConnectingMap.clear();
      this.lastKeepAliveMap.clear();
      this.reportMap.clear();
      this.lastUpdateMap.clear();
      this.pktTotal = 0;
      this.pktUftag = 0;
      this.pktOwn = 0;
      this.pktLost = 0;
   }
}

export const tagTrackerService = new TagTrackerService();