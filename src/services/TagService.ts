import { bleManager } from "./BleManager";
import { updateDeviceName } from "../api/devices";
import { updateDeviceState } from "../storage/devicesStorage";
import { tagTrackerService } from "./TagTrackerService";
import { Buffer } from "buffer";
import { Device } from "react-native-ble-plx";

const UFTAG_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const UFTAG_CHAR_ID_UUID  = "0000fff3-0000-1000-8000-00805f9b34fb";
const UFTAG_CHAR_NAME_UUID = "0000fff4-0000-1000-8000-00805f9b34fb";
const UFTAG_CHAR_CMD_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";

const decodeBase64Text = (base64: string) => {
   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
   let str = "";
   const cleanBase64 = base64.replace(/=+$/, "");

   for (let i = 0; i < cleanBase64.length; i += 4) {
      let n = (chars.indexOf(cleanBase64[i]) << 18)
         + (chars.indexOf(cleanBase64[i + 1]) << 12)
         + ((cleanBase64[i + 2] ? chars.indexOf(cleanBase64[i + 2]) : 0) << 6)
         + (cleanBase64[i + 3] ? chars.indexOf(cleanBase64[i + 3]) : 0);

      str += String.fromCharCode((n >>> 16) & 255);
      if (cleanBase64[i + 2]) str += String.fromCharCode((n >>> 8) & 255);
      if (cleanBase64[i + 3]) str += String.fromCharCode(n & 255);
   }
   return str.replace(/\0/g, "");
};

/**
 * Para o scan do TagTrackerService, encontra a tag via BLE, conecta e retorna
 * o Device conectado. O chamador é responsável por desconectar e retomar o tracking.
 */
async function findAndConnectTag(targetDeviceId: string): Promise<Device> {
   // Para o scan do background tracker para evitar conflito no Android
   tagTrackerService.stopTracking();

   return new Promise<Device>((resolve, reject) => {
      let isSearching = true;

      const timeoutId = setTimeout(() => {
         if (isSearching) {
            isSearching = false;
            bleManager.stopDeviceScan();
            reject(new Error("Tag física não encontrada. Aproxime-se do dispositivo."));
         }
      }, 12000);

      const startScan = () => {
         if (!isSearching) return;

         bleManager.startDeviceScan(null, { allowDuplicates: false }, async (error, device) => {
            if (error) {
               if (isSearching) {
                  isSearching = false;
                  clearTimeout(timeoutId);
                  bleManager.stopDeviceScan();
                  reject(new Error(`Erro no scan BLE: ${error.message}`));
               }
               return;
            }

            if (!device || !device.manufacturerData) return;

            // Filtro rápido: prefixo do manufacturer data de UFTag
            const mfr = device.manufacturerData;
            if (!mfr.startsWith("//8") && !mfr.startsWith("AP8")) return;

            // Para o scan e conecta para validar o ID
            bleManager.stopDeviceScan();

            try {
               console.log(`[TagService] Conectando a ${device.id} para validação...`);
               const connected = await device.connect();
               await connected.discoverAllServicesAndCharacteristics();

               const idChar = await connected.readCharacteristicForService(
                  UFTAG_SERVICE_UUID,
                  UFTAG_CHAR_ID_UUID
               );
               const decodedId = decodeBase64Text(idChar.value || "");

               if (decodedId === targetDeviceId) {
                  // Tag correta encontrada — retorna já conectada
                  isSearching = false;
                  clearTimeout(timeoutId);
                  resolve(connected);
               } else {
                  console.log(`[TagService] ID lido (${decodedId}) não corresponde. Desconectando...`);
                  await connected.cancelConnection();
                  startScan();
               }
            } catch (connErr) {
               console.warn(`[TagService] Falha na conexão de validação com ${device.id}:`, connErr);
               startScan();
            }
         });
      };

      startScan();
   });
}

/**
 * Renomeia o dispositivo na API e sincroniza a alteração fisicamente com o nRF52840 via BLE.
 * A Tag física aceita no máximo 12 caracteres.
 */
export async function renameTagAndSyncBle(deviceId: string, newName: string): Promise<void> {
   const nameTrimmed = newName.trim();
   if (nameTrimmed.length < 2 || nameTrimmed.length > 12) {
      throw new Error("O nome deve conter entre 2 e 12 caracteres.");
   }

   console.log(`[TagRename] Renomeando device ${deviceId} para "${nameTrimmed}"...`);

   // 1. Atualiza na API
   const apiResult = await updateDeviceName(deviceId, nameTrimmed);
   if (!apiResult.ok) {
      throw new Error(apiResult.error || "Não foi possível atualizar o nome no servidor.");
   }

   // 2. Encontra e conecta à tag física (scan do tracker é pausado internamente)
   let connected: Device | null = null;
   try {
      connected = await findAndConnectTag(deviceId);

      // 3. Grava o nome via FFF4
      const shortName = nameTrimmed.substring(0, 12);
      const nameBase64 = Buffer.from(shortName).toString("base64");

      console.log(`[TagRename] Gravando nome "${shortName}" na característica FFF4...`);
      try {
         await connected.writeCharacteristicWithResponseForService(
            UFTAG_SERVICE_UUID,
            UFTAG_CHAR_NAME_UUID,
            nameBase64
         );
         console.log(`[TagRename] Nome gravado com sucesso no hardware.`);
      } catch (bleErr: any) {
         // O nRF se desconecta sozinho após o write bem-sucedido — isso é esperado
         const isDisconnect = bleErr.message?.includes("disconnected") || bleErr.errorCode === 201;
         if (!isDisconnect) {
            throw new Error("Falha ao gravar o nome fisicamente na Tag.");
         }
         console.log(`[TagRename] Tag desconectada após alteração (comportamento esperado).`);
         connected = null; // Já desconectou sozinho
      }

      // 4. Atualiza o estado local imediatamente
      await updateDeviceState(deviceId, {
         locationText: "Nome alterado e sincronizado"
      });
   } finally {
      // Garante desconexão e retoma o rastreamento em segundo plano
      if (connected) {
         try { await connected.cancelConnection(); } catch (_) {}
      }
      tagTrackerService.startBackgroundTracking();
   }
}

/**
 * Envia o comando de Alerta Máximo (CMD_ALERT) para o nRF52840 via BLE.
 */
export async function triggerTagAlert(
   deviceId: string,
   durationMs: number = 5000,
   onConnected?: () => void
): Promise<void> {
   console.log(`[TagAlert] Buscando tag física ${deviceId} para acionar alerta...`);

   let connected: Device | null = null;
   try {
      connected = await findAndConnectTag(deviceId);

      if (onConnected) {
         onConnected();
      }

      // Prepara o payload: [CMD_ALERT=0x04, hiMs, loMs, 0x00]
      const hiMs = (durationMs >> 8) & 0xFF;
      const loMs = durationMs & 0xFF;
      const payload = Buffer.from([0x04, hiMs, loMs, 0x00]);
      const payloadBase64 = payload.toString("base64");

      console.log(`[TagAlert] Enviando comando de alerta (${durationMs}ms) via FFF1...`);
      await connected.writeCharacteristicWithResponseForService(
         UFTAG_SERVICE_UUID,
         UFTAG_CHAR_CMD_UUID,
         payloadBase64
      );
      console.log(`[TagAlert] Alerta acionado com sucesso.`);
   } catch (err: any) {
      const isDisconnect = err.message?.includes("disconnected") || err.errorCode === 201;
      if (!isDisconnect) {
         console.error(`[TagAlert] Erro ao enviar comando de alerta:`, err);
         throw new Error(err.message || "Falha ao enviar comando de alerta para a Tag.");
      }
      connected = null;
   } finally {
      if (connected) {
         try { await connected.cancelConnection(); } catch (_) {}
      }
      tagTrackerService.startBackgroundTracking();
   }
}


