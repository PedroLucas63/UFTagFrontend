import React, { useEffect, useState } from "react";
import {
   View,
   Text,
   TouchableOpacity,
   Alert,
   Modal,
   TextInput,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAppNavigation } from "../navigation/types";
import { BottomNav } from "../components/BottomNav";
import { RippleAnimation } from "../components/RippleAnimation";
import { ScanningDots } from "../components/ScanningDots";

// NFC
let NfcManager: any = null;
let NfcEvents: any = null;

try {
   const NfcLib = require("react-native-nfc-manager");

   NfcManager = NfcLib.default;
   NfcEvents = NfcLib.NfcEvents;
} catch (e) {
   console.warn(
      "react-native-nfc-manager não pôde ser carregado:",
      e
   );
}

function decodeNfcPayload(
   payload: number[] | Uint8Array | undefined
): string | null {
   if (!payload?.length) return null;

   try {
      const NfcLib = require("react-native-nfc-manager");

      return NfcLib?.Ndef?.uri?.decodePayload(payload);
   } catch { }

   const prefixes: Record<number, string> = {
      0x01: "http://www.",
      0x02: "https://www.",
      0x03: "http://",
      0x04: "https://",
   };

   const prefix = prefixes[payload[0]] ?? "";

   let rest = "";

   for (let i = 1; i < payload.length; i++) {
      rest += String.fromCharCode(payload[i]);
   }

   return prefix + rest;
}

export function ScannerScreen() {
   const navigation = useAppNavigation();

   const [simModalOpen, setSimModalOpen] =
      useState(false);

   const [simDeviceId, setSimDeviceId] =
      useState("");

   const extractIdFromUrl = (
      url: string
   ): string | null => {
      try {
         const publicMatch = url.match(
            /\/public\/([a-zA-Z0-9-]+)/
         );

         if (publicMatch?.[1]) {
            return publicMatch[1];
         }

         return url.split("/").pop()?.trim() ?? null;
      } catch {
         return null;
      }
   };

   const navigateToTagInfo = (id: string) => {
      navigation.navigate("TagInfo", {
         deviceId: id,
      });
   };

   useEffect(() => {
      let mounted = true;

      async function initializeNfc() {
         if (!NfcManager) {
            return;
         }

         try {
            await NfcManager.start();

            NfcManager.setEventListener(
               NfcEvents.DiscoverTag,
               async (tag: any) => {
                  if (!mounted) return;

                  let payload:
                     | number[]
                     | undefined;

                  if (
                     tag?.ndefMessage?.[0]
                  ) {
                     payload = Array.from(
                        tag.ndefMessage[0].payload
                     );
                  }

                  const url =
                     decodeNfcPayload(payload);

                  if (!url) {
                     Alert.alert(
                        "Erro",
                        "Não foi possível ler a tag NFC."
                     );
                     return;
                  }

                  const id =
                     extractIdFromUrl(url);

                  if (!id) {
                     Alert.alert(
                        "Erro",
                        "ID inválido encontrado na tag."
                     );
                     return;
                  }

                  navigateToTagInfo(id);
               }
            );

            await NfcManager.registerTagEvent();
         } catch (e) {
            console.warn(
               "Erro ao iniciar NFC",
               e
            );
         }
      }

      initializeNfc();

      return () => {
         mounted = false;

         if (NfcManager) {
            NfcManager
               .unregisterTagEvent()
               .catch(() => { });

            NfcManager.setEventListener(
               NfcEvents.DiscoverTag,
               null
            );
         }
      };
   }, []);

   const handleSimulateScan = () => {
      if (!simDeviceId.trim()) {
         Alert.alert(
            "Aviso",
            "Digite um ID válido."
         );
         return;
      }

      setSimModalOpen(false);

      navigateToTagInfo(
         simDeviceId.trim()
      );
   };

   return (
      <View className="flex-1 bg-slate-900">
         <View className="flex-1 items-center justify-center px-6">
            <View className="relative items-center justify-center mb-12">
               <RippleAnimation />

               <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center">
                  <Svg
                     width={52}
                     height={52}
                     viewBox="0 0 24 24"
                     fill="none"
                  >
                     <Path
                        d="M 6.78 8.72 A 4 4 0 0 1 6.78 15.28"
                        stroke="#FFFFFF"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                     />
                     <Path
                        d="M 8.49 6.26 A 7 7 0 0 1 8.49 17.74"
                        stroke="#FFFFFF"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                     />
                     <Path
                        d="M 10.2 3.8 A 10 10 0 0 1 10.2 20.2"
                        stroke="#FFFFFF"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                     />
                     <Path
                        d="M 11.91 1.34 A 13 13 0 0 1 11.91 22.66"
                        stroke="#FFFFFF"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                     />
                  </Svg>
               </View>
            </View>

            <Text className="text-white text-2xl font-semibold">
               Scanner NFC
            </Text>

            <Text className="text-slate-400 text-base mt-3 text-center">
               Aproxime a tag do aparelho
            </Text>

            <ScanningDots />
         </View>

         <TouchableOpacity
            onPress={() =>
               setSimModalOpen(true)
            }
            className="absolute bottom-28 self-center bg-slate-800 border border-slate-700 rounded-full px-5 py-3"
         >
            <Text className="text-slate-300 text-xs font-medium">
               Simular Leitura (Dev)
            </Text>
         </TouchableOpacity>

         <Modal
            visible={simModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() =>
               setSimModalOpen(false)
            }
         >
            <View className="flex-1 bg-black/70 justify-center px-6">
               <View className="bg-white rounded-3xl p-6">
                  <Text className="text-lg font-semibold text-slate-900">
                     Simulador NFC
                  </Text>

                  <Text className="text-slate-500 mt-2 mb-4">
                     Informe um ID para testar.
                  </Text>

                  <TextInput
                     className="border border-slate-200 rounded-xl px-4 py-3"
                     value={simDeviceId}
                     onChangeText={setSimDeviceId}
                     autoCapitalize="none"
                     autoCorrect={false}
                  />

                  <View className="flex-row mt-4">
                     <TouchableOpacity
                        className="flex-1 bg-slate-100 rounded-xl py-3 items-center mr-2"
                        onPress={() =>
                           setSimModalOpen(false)
                        }
                     >
                        <Text>
                           Cancelar
                        </Text>
                     </TouchableOpacity>

                     <TouchableOpacity
                        className="flex-1 bg-blue-600 rounded-xl py-3 items-center ml-2"
                        onPress={
                           handleSimulateScan
                        }
                     >
                        <Text className="text-white font-medium">
                           Confirmar
                        </Text>
                     </TouchableOpacity>
                  </View>
               </View>
            </View>
         </Modal>

         <BottomNav />
      </View>
   );
}