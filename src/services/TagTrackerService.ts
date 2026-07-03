import { locationService } from './LocationService';
import { Buffer } from 'buffer';
import { bleManager } from './BleManager';
import { getAllPublicKey, updateDeviceState } from '../storage/devicesStorage';
import { LocationReportRequest, reportLocation } from '../api/locations';
import { Device } from 'react-native-ble-plx';
import { encryptWithPublicKey } from '../crypto/asymmetric';

// ─── Constantes do protocolo UFTag ────────────────────────────────────────────
const COMPANY_ID_LO = 0xFF;
const COMPANY_ID_HI = 0xFF;
const UPDATE_THROTTLE_MS = 500;   // ms entre updates da mesma tag
const REPORT_THROTTLE_MS = 30000; // ms entre envios de relatório para a API

// UUID do serviceData que identifica um pacote UFTag
const TARGET_RESPONSE_UUID = "0000abff-0000-1000-8000-00805f9b34fb";

// Layout do manufacturer data:
//   [0..1] = Company ID (0xFF 0xFF)
//   [2]    = isLost flag (0x01 = perdida)
//   [3..25] = primeiros 23 bytes da chave pública Curve25519
//   serviceData[TARGET_RESPONSE_UUID] = últimos 9 bytes da chave → total 32
const PART1_OFFSET = 3;
const PART1_LEN    = 23;          // bytes[3..25]
const PART1_END    = PART1_OFFSET + PART1_LEN; // = 26

// ─── Helpers de log ───────────────────────────────────────────────────────────
const TAG  = '[TagTracker]';
const NET  = '[REDE]';
const KEY  = '[KEYS]';
const BLE  = '[BLE]';

function shortB64(b64: string, n = 10): string {
   return `${b64.substring(0, n)}…`;
}

// ─────────────────────────────────────────────────────────────────────────────

class TagTrackerService {
   private isScanning = false;

   // Throttle de updates da própria tag
   private lastUpdateMap = new Map<string, number>();

   // Índice rápido: 23-bytes base64 → deviceId  (para lookup por manufacturer data)
   private partialKeyToDeviceId = new Map<string, string>();

   // Índice rápido: 32-bytes base64 → deviceId  (para lookup quando serviceData disponível)
   private fullKeyToDeviceId = new Map<string, string>();

   // Relatórios pendentes de envio: partialKeyBase64 → payload
   private reportMap = new Map<string, LocationReportRequest>();

   private reportInterval: ReturnType<typeof setInterval> | null = null;

   // ─── Contador de pacotes para diagnóstico ─────────────────────────────────
   private pktTotal = 0;
   private pktUftag = 0;
   private pktOwn   = 0;
   private pktLost  = 0;

   // ─── API pública ──────────────────────────────────────────────────────────

   async startBackgroundTracking() {
      if (this.isScanning) {
         console.log(`${TAG} startBackgroundTracking() chamado mas já está rodando.`);
         return;
      }

      console.log(`${TAG} ══════════════════════════════════════════`);
      console.log(`${TAG} Iniciando rastreamento em segundo plano...`);
      console.log(`${TAG} ══════════════════════════════════════════`);

      // 1) Carrega chaves para RAM
      await this.loadKeysToMemory();

      // 2) Verifica se há GPS disponível
      const pos = locationService.getLastKnownPosition();
      if (pos) {
         console.log(`${TAG} GPS: última posição conhecida → lat=${pos.latitude.toFixed(5)}, lng=${pos.longitude.toFixed(5)}`);
      } else {
         console.warn(`${TAG} GPS: nenhuma posição conhecida ainda. Reports usarão 0;0 até o GPS fixar.`);
      }

      this.isScanning = true;

      // 3) Timer de envio de relatórios (a cada 30s)
      this.reportInterval = setInterval(async () => {
         await this.flushReports();
      }, REPORT_THROTTLE_MS);

      // 4) Monitor de diagnóstico (a cada 60s)
      setInterval(() => {
         console.log(`${TAG} ── Diagnóstico ──────────────────────────`);
         console.log(`${TAG}   Pacotes recebidos:  ${this.pktTotal}`);
         console.log(`${TAG}   Pacotes UFTag:      ${this.pktUftag}`);
         console.log(`${TAG}   Tags próprias:      ${this.pktOwn}`);
         console.log(`${TAG}   Tags perdidas (3º): ${this.pktLost}`);
         console.log(`${TAG}   Reports pendentes:  ${this.reportMap.size}`);
         console.log(`${TAG}   Chaves na RAM:      ${this.partialKeyToDeviceId.size} (partial), ${this.fullKeyToDeviceId.size} (full)`);
         const gps = locationService.getLastKnownPosition();
         console.log(`${TAG}   GPS atual:          ${gps ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}` : 'sem sinal'}`);
         console.log(`${TAG} ──────────────────────────────────────────`);
      }, 60_000);

      // 5) Inicia scan BLE
      console.log(`${BLE} Iniciando scan SEM filtro de UUID (filtragem manual por Company ID)`);
      console.log(`${BLE} Company ID esperado: 0x${COMPANY_ID_LO.toString(16).padStart(2,'0')} 0x${COMPANY_ID_HI.toString(16).padStart(2,'0')}`);

      bleManager.startDeviceScan(
         null, // null = escaneia todos os dispositivos BLE
         { allowDuplicates: true },
         async (error, device) => {
            if (error) {
               console.error(`${BLE} ❌ Erro no scan:`, error.message, `| código: ${error.errorCode}`);
               this.isScanning = false;
               if (this.reportInterval) {
                  clearInterval(this.reportInterval);
                  this.reportInterval = null;
               }
               return;
            }

            if (!device) return;

            this.pktTotal++;

            // Log de cada pacote recebido (verboso – pode comentar em produção)
            console.log(
               `${BLE} Pacote #${this.pktTotal} | id=${device.id}` +
               ` | name=${device.name ?? 'N/A'}` +
               ` | rssi=${device.rssi}` +
               ` | mfrData=${device.manufacturerData ? shortB64(device.manufacturerData) : 'null'}` +
               ` | svcData=${device.serviceData ? JSON.stringify(Object.keys(device.serviceData)) : 'null'}`
            );

            if (!device.manufacturerData) {
               console.log(`${BLE}   └─ Ignorado: sem manufacturerData`);
               return;
            }

            await this.processDevice(device);
         }
      );

      console.log(`${BLE} Scan iniciado ✓`);
   }

   stopTracking() {
      if (this.isScanning) {
         bleManager.stopDeviceScan();
         this.isScanning = false;
         console.log(`${TAG} Scan parado.`);
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

         console.log(`${BLE}   └─ manufacturerData decodificado: ${rawData.length} bytes`);
         console.log(`${BLE}      hex: ${rawData.toString('hex').substring(0, 40)}...`);

         // Valida company ID
         if (rawData.length < PART1_END) {
            console.log(`${BLE}   └─ Ignorado: payload curto demais (${rawData.length} bytes, precisa ≥ ${PART1_END})`);
            return;
         }

         const cmpLo = rawData[0];
         const cmpHi = rawData[1];
         if (cmpLo !== COMPANY_ID_LO || cmpHi !== COMPANY_ID_HI) {
            console.log(`${BLE}   └─ Ignorado: Company ID errado (0x${cmpLo.toString(16).padStart(2,'0')} 0x${cmpHi.toString(16).padStart(2,'0')})`);
            return;
         }

         this.pktUftag++;
         const isLost = rawData[2] === 0x01;
         console.log(`${BLE}   └─ ✅ Pacote UFTag válido #${this.pktUftag} | isLost=${isLost}`);

         // Extrai parte 1 da chave (23 bytes do manufacturer data)
         const part1Buffer     = rawData.subarray(PART1_OFFSET, PART1_END);
         const partialKeyBase64 = Buffer.from(part1Buffer).toString('base64');
         console.log(`${KEY}   Parte 1 da chave (23 bytes): ${shortB64(partialKeyBase64)}`);

         // Extrai parte 2 da chave (serviceData → 9 bytes)
         let fullKey: string | null        = null;
         let fullKeyBuffer: Buffer | null  = null;

         if (device.serviceData && device.serviceData[TARGET_RESPONSE_UUID]) {
            const part2Buffer = Buffer.from(device.serviceData[TARGET_RESPONSE_UUID], 'base64');
            fullKeyBuffer     = Buffer.concat([part1Buffer, part2Buffer]);
            fullKey           = fullKeyBuffer.toString('base64');
            console.log(`${KEY}   Parte 2 da chave (${part2Buffer.length} bytes via serviceData): ${shortB64(device.serviceData[TARGET_RESPONSE_UUID])}`);
            console.log(`${KEY}   Chave completa (${fullKeyBuffer.length} bytes): ${shortB64(fullKey)}`);
         } else {
            console.warn(`${KEY}   ⚠️  serviceData ausente para UUID ${TARGET_RESPONSE_UUID} — chave completa indisponível`);
         }

         // ─── Reconhecimento de posse ───────────────────────────────────────
         const myDeviceIdByPartial = this.partialKeyToDeviceId.get(partialKeyBase64);
         const myDeviceIdByFull    = fullKey ? this.fullKeyToDeviceId.get(fullKey) : undefined;
         const myDeviceId          = myDeviceIdByPartial ?? myDeviceIdByFull;

         console.log(`${KEY}   Lookup partial (${shortB64(partialKeyBase64)}): ${myDeviceIdByPartial ?? 'não encontrado'}`);
         if (fullKey) {
            console.log(`${KEY}   Lookup full    (${shortB64(fullKey)}):    ${myDeviceIdByFull ?? 'não encontrado'}`);
         }

         if (myDeviceId) {
            // ─── TAG DO PRÓPRIO USUÁRIO ────────────────────────────────────
            this.pktOwn++;
            console.log(`${TAG} 🏷️  MINHA Tag | device=${myDeviceId} | rssi=${device.rssi} | isLost=${isLost}`);

            // Dono SEMPRE reporta localização (ignora flag isLost)
            await this.processFoundTag(myDeviceId, partialKeyBase64, device.rssi, isLost);

            if (fullKey && fullKeyBuffer) {
               await this.queueLocationReport(partialKeyBase64, fullKey, fullKeyBuffer, device, /* isOwner */ true);
            } else {
               console.warn(`${TAG}   ⚠️  Chave completa ausente — report para API não enfileirado (sem serviceData)`);
            }

         } else if (fullKey && fullKeyBuffer) {
            // ─── TAG DE TERCEIRO ──────────────────────────────────────────
            console.log(`${NET} 👤 Tag desconhecida | rssi=${device.rssi} | isLost=${isLost} | chave=${shortB64(fullKey)}`);

            if (isLost) {
               // Terceiro só envia se a flag isLost estiver ativa
               this.pktLost++;
               console.log(`${NET}   └─ 🆘 isLost=true → enfileirando relatório de localização`);
               await this.queueLocationReport(partialKeyBase64, fullKey, fullKeyBuffer, device, /* isOwner */ false);
            } else {
               console.log(`${NET}   └─ isLost=false → ignorando (modo companion inativo)`);
            }

         } else {
            // Pacote UFTag sem serviceData (chave incompleta) e não é minha tag
            console.log(`${TAG}   └─ Chave incompleta + tag não reconhecida → ignorado`);
         }

      } catch (err) {
         console.error(`${TAG} ❌ Erro ao processar pacote BLE:`, err);
      }
   }

   // ─── Enfileiramento de relatório de localização ───────────────────────────

   /**
    * Cria (ou sobrescreve) um relatório de localização para a tag.
    * @param isOwner se true, sempre enfileira (dono ignora flag); se false, só se isLost
    */
   private async queueLocationReport(
      partialKeyBase64: string,
      fullKey: string,
      fullKeyBuffer: Buffer,
      device: Device,
      isOwner: boolean,
   ) {
      // Throttle: só substitui se ainda não existe relatório pendente
      if (this.reportMap.has(partialKeyBase64)) {
         console.log(`${TAG}   Report já enfileirado para esta tag (aguardando flush em ${REPORT_THROTTLE_MS / 1000}s)`);
         return;
      }

      try {
         const location    = locationService.getLastKnownPosition();
         const lat         = location?.latitude  ?? 0;
         const lng         = location?.longitude ?? 0;
         const locationStr = `${lat};${lng}`;

         console.log(`${TAG}   Cifrando localização (${lat.toFixed(5)}, ${lng.toFixed(5)}) com chave ${shortB64(fullKey)} [isOwner=${isOwner}]`);

         const locationEncrypted = await encryptWithPublicKey(locationStr, fullKeyBuffer);

         const report: LocationReportRequest = {
            Key:               fullKey,
            LocationEncrypted: locationEncrypted,
            Rssi:              device.rssi ?? 0,
            Battery:           device.txPowerLevel !== null && device.txPowerLevel !== undefined
                                  ? Math.max(0, Math.min(100, Math.round(device.txPowerLevel * 100)))
                                  : 0,
            Timestamp:         new Date().toISOString(),
         };

         this.reportMap.set(partialKeyBase64, report);
         console.log(`${TAG}   ✅ Relatório enfileirado | key=${shortB64(fullKey)} | rssi=${report.Rssi} | bat=${report.Battery}%`);

      } catch (err) {
         console.error(`${TAG}   ❌ Erro ao cifrar/enfileirar relatório:`, err);
      }
   }

   // ─── Processamento da tag do próprio usuário ──────────────────────────────

   private async processFoundTag(
      deviceId: string,
      cacheKey: string,
      rssi: number | null,
      isLost: boolean,
   ) {
      const now        = Date.now();
      const lastUpdate = this.lastUpdateMap.get(cacheKey) ?? 0;

      if (now - lastUpdate < UPDATE_THROTTLE_MS) {
         console.log(`${TAG}   Throttle ativo (${UPDATE_THROTTLE_MS}ms) — update local ignorado`);
         return;
      }
      this.lastUpdateMap.set(cacheKey, now);

      const location = locationService.getLastKnownPosition();
      const isNear   = rssi !== null ? rssi > -75 : false;

      console.log(`${TAG}   Atualizando estado local | isNear=${isNear} | gps=${location ? 'sim' : 'não'} | isLost=${isLost}`);

      await updateDeviceState(deviceId, {
         rssi:        rssi !== null ? rssi.toString() : '-',
         isNear,
         locationLat: location?.latitude  ?? null,
         locationLng: location?.longitude ?? null,
         locationText: location ? 'Atualizado via GPS' : '-',
      });
   }

   // ─── Carga das chaves do Keychain para RAM ────────────────────────────────

   private async loadKeysToMemory() {
      console.log(`${KEY} ══ Carregando chaves do Keychain ══`);
      this.partialKeyToDeviceId.clear();
      this.fullKeyToDeviceId.clear();

      let tags: Map<string, string>;
      try {
         tags = await getAllPublicKey();
      } catch (err) {
         console.error(`${KEY} ❌ Falha ao chamar getAllPublicKey():`, err);
         return;
      }

      if (tags.size === 0) {
         console.warn(`${KEY} ⚠️  Nenhuma chave pública encontrada no Keychain!`);
         console.warn(`${KEY}    → Verifique se o dispositivo foi pareado e se as chaves foram salvas.`);
         return;
      }

      for (const [deviceId, publicKeyBase64] of tags.entries()) {
         const fullKeyBytes = Buffer.from(publicKeyBase64, 'base64');

         console.log(`${KEY} Dispositivo: ${deviceId}`);
         console.log(`${KEY}   chave completa (${fullKeyBytes.length} bytes): ${shortB64(publicKeyBase64)}`);

         if (fullKeyBytes.length < PART1_LEN) {
            console.warn(`${KEY}   ⚠️  Chave muito curta (${fullKeyBytes.length} bytes) — ignorada`);
            continue;
         }

         // Índice pela chave completa
         this.fullKeyToDeviceId.set(publicKeyBase64, deviceId);

         // Índice pelos primeiros 23 bytes (parte do manufacturer data)
         const partialBytes  = fullKeyBytes.subarray(0, PART1_LEN);
         const partialBase64 = Buffer.from(partialBytes).toString('base64');
         this.partialKeyToDeviceId.set(partialBase64, deviceId);

         console.log(`${KEY}   partial (${PART1_LEN}b): ${shortB64(partialBase64)} → mapeado ✓`);
      }

      console.log(`${KEY} ══ ${this.partialKeyToDeviceId.size} dispositivo(s) indexado(s) ══`);
   }

   // ─── Envio dos relatórios pendentes ──────────────────────────────────────

   private async flushReports() {
      if (this.reportMap.size === 0) {
         console.log(`${TAG} Flush: nenhum relatório pendente.`);
         return;
      }

      console.log(`${TAG} Flush: enviando ${this.reportMap.size} relatório(s) para a API...`);
      const entries = Array.from(this.reportMap.entries());

      await Promise.all(
         entries.map(async ([partialKey, report]) => {
            try {
               await reportLocation(report);
               this.reportMap.delete(partialKey);
               console.log(`${TAG}   ✅ Enviado | key=${shortB64(report.Key)} | rssi=${report.Rssi}`);
            } catch (error) {
               console.error(`${TAG}   ❌ Falha ao enviar | key=${shortB64(report.Key)}:`, error);
            }
         })
      );
   }
}

export const tagTrackerService = new TagTrackerService();