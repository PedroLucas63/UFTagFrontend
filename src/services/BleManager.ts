import { BleManager } from "react-native-ble-plx";
import { Platform } from "react-native";

// No Android, passar esse parâmetro causa erros de inicialização.
export const bleManager = new BleManager(
   Platform.OS === "ios"
      ? {
           restoreStateIdentifier: "UFTagBleRestoreIdentifier",
           restoreStateFunction: (restoredState) => {
              console.log("[BLE] Estado restaurado em segundo plano (iOS):", restoredState);
           },
        }
      : undefined
);
