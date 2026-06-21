import React, { useEffect, useState } from "react";
import {
   View,
   Text,
   TouchableOpacity,
   Platform,
   PermissionsAndroid,
   ActivityIndicator,
   FlatList,
} from "react-native";

import { ArrowLeft, Bluetooth, Tag } from "lucide-react-native";
import { useAppNavigation } from "../navigation/types";
import { BottomNav } from "../components/BottomNav";
import { RippleAnimation } from "../components/RippleAnimation";
import { BleManager, Device } from "react-native-ble-plx";

// Importe o seu AlertModal do local correto no seu projeto
import { AlertModal } from "../components/AlertModal";

export const bleManager = new BleManager();

const UFTAG_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const UFTAG_CHAR_ID_UUID = "0000fff3-0000-1000-8000-00805f9b34fb";

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

export function AddTagScreen() {
   const navigation = useAppNavigation();

   const [isScanning, setIsScanning] = useState(true);
   const [isConnecting, setIsConnecting] = useState(false);
   const [foundDevices, setFoundDevices] = useState<Device[]>([]);

   // Estados para controlar o AlertModal customizado
   const [alertVisible, setAlertVisible] = useState(false);
   const [alertTitle, setAlertTitle] = useState("");
   const [alertMessage, setAlertMessage] = useState("");

   const handleBack = () => {
      bleManager.stopDeviceScan();
      navigation.navigate("Home");
   };

   useEffect(() => {
      const startBleScan = async () => {
         const hasPermission = await requestBluetoothPermissions();
         if (!hasPermission) {
            console.log("Permissão de Bluetooth negada.");
            setIsScanning(false);
            return;
         }
         scanForUFTags();
      };

      startBleScan();

      return () => {
         bleManager.stopDeviceScan();
      };
   }, []);

   const requestBluetoothPermissions = async () => {
      if (Platform.OS === "ios") return true;

      if (Platform.OS === "android" && Platform.Version >= 31) {
         const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
         ]);
         return (
            result["android.permission.BLUETOOTH_CONNECT"] === "granted" &&
            result["android.permission.BLUETOOTH_SCAN"] === "granted"
         );
      } else if (Platform.OS === "android" && Platform.Version >= 23) {
         const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
         );
         return result === "granted";
      }
      return true;
   };

   const scanForUFTags = () => {
      setIsScanning(true);
      setFoundDevices([]);

      bleManager.startDeviceScan(null, {
         allowDuplicates: true,
      }, (error, device) => {
         if (error) {
            console.error("Erro no scan:", error.message);
            setIsScanning(false);
            return;
         }

         if (!device) return;
         if (!device.manufacturerData) return;
         if (!device.manufacturerData.startsWith("//8=")) return;

         setFoundDevices((prev) => {
            if (!prev.find((d) => d.id === device.id)) {
               return [...prev, device];
            }
            return prev;
         });
      });
   };

   const handleTagSelect = async (device: Device) => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      setIsConnecting(true);

      try {
         console.log(`[BLE] Conectando a ${device.id}...`);
         const connectedDevice = await device.connect();

         console.log(`[BLE] Descobrindo serviços...`);
         await connectedDevice.discoverAllServicesAndCharacteristics();

         console.log(`[BLE] Lendo o Device ID...`);
         const idCharacteristic = await connectedDevice.readCharacteristicForService(
            UFTAG_SERVICE_UUID,
            UFTAG_CHAR_ID_UUID
         );

         const deviceIdReal = decodeBase64Text(idCharacteristic.value || "");
         console.log(`[BLE] Sucesso! ID da Tag: ${deviceIdReal}`);

         setIsConnecting(false);

         navigation.navigate("ConfigureTag", {
            deviceId: deviceIdReal,
            bleMacAddress: device.id,
         });

      } catch (error: any) {
         setIsConnecting(false);
         console.error("[BLE] Erro na conexão:", error);

         // Configura e exibe o modal dependendo do erro
         if (error.message?.includes("disconnected") || error.errorCode === 201) {
            setAlertTitle("Acesso Negado");
            setAlertMessage("Esta Tag já possui um dono e rejeitou a conexão.\n\nSe a Tag for sua, faça um reset físico nela para poder parear com este celular.");
         } else {
            setAlertTitle("Falha no Pareamento");
            setAlertMessage("Não foi possível concluir o pareamento. Tente novamente.");
         }

         setAlertVisible(true);
      }
   };

   return (
      <View className="flex-1 bg-slate-900">
         <View className="px-6 pt-14 pb-4">
            <TouchableOpacity onPress={handleBack} className="flex-row items-center" activeOpacity={0.7}>
               <ArrowLeft size={20} color="#FFFFFF" />
               <Text className="ml-2 text-white text-base">Voltar</Text>
            </TouchableOpacity>
         </View>

         <View className="pt-6 items-center">
            <View className="relative items-center justify-center mb-6">
               {(isScanning || isConnecting) && <RippleAnimation />}
               <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center z-10">
                  <Bluetooth size={48} color="#FFFFFF" />
               </View>
            </View>

            <Text className="text-white text-xl font-semibold text-center">
               {isConnecting
                  ? "Conectando e Pareando..."
                  : isScanning
                     ? "Buscando UFTags..."
                     : "Busca finalizada"}
            </Text>
            <Text className="text-slate-400 text-center mt-2 px-8">
               {isConnecting
                  ? "Aceite a solicitação de pareamento se aparecer na sua tela."
                  : "Ligue sua tag e aguarde ela aparecer na lista abaixo."}
            </Text>
         </View>

         <View className="flex-1 px-6 mt-8">
            {(foundDevices.length === 0 && isScanning) || isConnecting ? (
               <View className="items-center justify-center pt-10">
                  <ActivityIndicator size="large" color="#2563EB" />
               </View>
            ) : (
               <FlatList
                  data={foundDevices}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  renderItem={({ item }) => (
                     <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleTagSelect(item)}
                        className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3 flex-row items-center"
                     >
                        <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center mr-4">
                           <Tag size={24} color="#60A5FA" />
                        </View>
                        <View className="flex-1">
                           <Text className="text-white font-semibold text-lg">
                              {item.name || "UFTag Desconhecida"}
                           </Text>
                           <Text className="text-slate-400 text-sm mt-1">
                              MAC: {item.id}
                           </Text>
                           <Text className="text-slate-400 text-sm mt-1">
                              Manufactor: {item.manufacturerData || "N/A"}
                           </Text>
                        </View>
                        <View className="bg-blue-600/20 px-3 py-1.5 rounded-full">
                           <Text className="text-blue-400 text-xs font-medium">
                              Conectar
                           </Text>
                        </View>
                     </TouchableOpacity>
                  )}
               />
            )}
         </View>

         <BottomNav />

         {/* Instância do AlertModal */}
         <AlertModal
            visible={alertVisible}
            title={alertTitle}
            message={alertMessage}
            onClose={() => setAlertVisible(false)}
         />
      </View>
   );
}