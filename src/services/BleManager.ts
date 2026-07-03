import { BleManager } from "react-native-ble-plx";

export const bleManager = new BleManager({
   restoreStateIdentifier: "UFTagBleRestoreIdentifier",
   restoreStateFunction: (restoredState) => {
      console.log("[BLE] Estado restaurado em segundo plano:", restoredState);
   },
});
