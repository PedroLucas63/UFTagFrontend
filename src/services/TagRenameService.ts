import { bleManager } from "./BleManager";
import { updateDeviceName } from "../api/devices";
import { updateDeviceState } from "../storage/devicesStorage";
import { Buffer } from "buffer";

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
 * Encontra a tag fisicamente via BLE e retorna o MAC address / Device UUID correspondente.
 */
async function findTagBleMac(targetDeviceId: string): Promise<string> {
   return new Promise<string>((resolve, reject) => {
      let isSearching = true;

      const timeoutId = setTimeout(() => {
         if (isSearching) {
            isSearching = false;
            bleManager.stopDeviceScan();
            reject(new Error("Tag física não encontrada. Aproxime-se do dispositivo para renomeá-lo."));
         }
      }, 10000); // 10 segundos de timeout

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

            // Filtro rápido de fabricante para UFTag
            if (device.manufacturerData.startsWith("//8") || device.manufacturerData.startsWith("AP8")) {
               // Para validar, precisamos pausar o scan e conectar
               bleManager.stopDeviceScan();

               try {
                  console.log(`[TagRename] Conectando a ${device.id} para validação...`);
                  const connected = await device.connect();
                  await connected.discoverAllServicesAndCharacteristics();
                  
                  const idChar = await connected.readCharacteristicForService(
                     UFTAG_SERVICE_UUID,
                     UFTAG_CHAR_ID_UUID
                  );
                  const decodedId = decodeBase64Text(idChar.value || "");

                  if (decodedId === targetDeviceId) {
                     // Tag encontrada!
                     isSearching = false;
                     clearTimeout(timeoutId);
                     resolve(device.id);
                  } else {
                     console.log(`[TagRename] ID lido (${decodedId}) não corresponde. Desconectando...`);
                     await connected.cancelConnection();
                     // Retoma o scan para buscar outras tags próximas
                     startScan();
                  }
               } catch (connErr) {
                  console.warn(`[TagRename] Falha na conexão de validação com ${device.id}:`, connErr);
                  // Retoma o scan
                  startScan();
               }
            }
         });
      };

      startScan();
   });
}

/**
 * Renomeia o dispositivo na API e sincroniza a alteração fisicamente com o nRF52840 via BLE.
 * A Tag física aceita no máximo 16 caracteres.
 */
export async function renameTagAndSyncBle(deviceId: string, newName: string): Promise<void> {
   const nameTrimmed = newName.trim();
   if (nameTrimmed.length < 2 || nameTrimmed.length > 12) {
      throw new Error("O nome deve conter entre 2 e 12 caracteres.");
   }

   console.log(`[TagRename] Iniciando renomeação do device ${deviceId} para "${nameTrimmed}"...`);

   // 1. Tenta atualizar na nuvem/API primeiro
   const apiResult = await updateDeviceName(deviceId, nameTrimmed);
   if (!apiResult.ok) {
      throw new Error(apiResult.error || "Não foi possível atualizar o nome no servidor.");
   }

   // 2. Busca e conecta com a tag física
   console.log(`[TagRename] Buscando tag física ${deviceId} no alcance BLE...`);
   const targetMacAddress = await findTagBleMac(deviceId);

   // 3. Grava o nome na tag via característica FFF4 (limite de 12 caracteres)
   const shortName = nameTrimmed.substring(0, 12);
   const nameBase64 = Buffer.from(shortName).toString("base64");

   console.log(`[TagRename] Gravando nome "${shortName}" na característica FFF4...`);
   try {
      await bleManager.writeCharacteristicWithResponseForDevice(
         targetMacAddress,
         UFTAG_SERVICE_UUID,
         UFTAG_CHAR_NAME_UUID,
         nameBase64
      );
      console.log(`[TagRename] Nome gravado com sucesso no hardware.`);
   } catch (bleErr: any) {
      // Como o nRF se desconecta sozinho após o nameWrite bem-sucedido,
      // um erro de "disconnected" ou código 201 é considerado sucesso.
      const isDisconnect = bleErr.message?.includes("disconnected") || bleErr.errorCode === 201;
      if (!isDisconnect) {
         console.error(`[TagRename] Erro ao gravar no BLE:`, bleErr);
         throw new Error("Falha ao gravar o nome fisicamente na Tag.");
      }
      console.log(`[TagRename] Tag desconectada com sucesso após alteração.`);
   }

   // 4. Atualiza o estado local para atualizar a interface imediatamente
   await updateDeviceState(deviceId, {
      locationText: "Nome alterado e sincronizado"
   });
}

/**
 * Envia o comando de Alerta Máximo (CMD_ALERT) para o nRF52840 via BLE.
 * Esse comando aciona o LED piscante na tag física.
 */
export async function triggerTagAlert(
   deviceId: string,
   durationMs: number = 5000,
   onConnected?: () => void
): Promise<void> {
   console.log(`[TagAlert] Buscando tag física ${deviceId} no alcance BLE para acionar alerta...`);
   const targetMacAddress = await findTagBleMac(deviceId);

   if (onConnected) {
      onConnected();
   }

   // Prepara o payload de 4 bytes para CMD_ALERT (0x04)
   const action = 0x04;
   const hiMs = (durationMs >> 8) & 0xFF;
   const loMs = durationMs & 0xFF;
   const payload = Buffer.from([action, hiMs, loMs, 0x00]);
   const payloadBase64 = payload.toString("base64");

   console.log(`[TagAlert] Enviando comando de alerta (${durationMs}ms) via FFF1...`);
   
   try {
      await bleManager.writeCharacteristicWithResponseForDevice(
         targetMacAddress,
         UFTAG_SERVICE_UUID,
         UFTAG_CHAR_CMD_UUID,
         payloadBase64
      );
      console.log(`[TagAlert] Alerta acionado com sucesso.`);
   } catch (err: any) {
      console.error(`[TagAlert] Erro ao enviar comando de alerta:`, err);
      throw new Error(err.message || "Falha ao enviar comando de alerta para a Tag.");
   } finally {
      // Sempre desconecta do dispositivo após enviar o comando
      try {
         await bleManager.cancelDeviceConnection(targetMacAddress);
         console.log(`[TagAlert] Desconectado da tag após comando.`);
      } catch (e) {
         console.warn("[TagAlert] Erro ao desconectar:", e);
      }
   }
}
