import React, { useState } from "react";
import {
   View,
   Text,
   TouchableOpacity,
   Modal,
   TextInput,
} from "react-native";

import {
   ArrowLeft,
   Bluetooth,
} from "lucide-react-native";

import { useAppNavigation } from "../navigation/types";
import { BottomNav } from "../components/BottomNav";

import { RippleAnimation } from "../components/RippleAnimation";
import { ScanningDots } from "../components/ScanningDots";

export function AddTagScreen() {
   const navigation = useAppNavigation();

   const [simModalOpen, setSimModalOpen] =
      useState(false);

   const [deviceId, setDeviceId] =
      useState("");

   const handleBack = () => {
      navigation.navigate("Home");
   };

   const handleContinue = () => {
      const id = deviceId.trim();

      if (!id) {
         return;
      }

      setSimModalOpen(false);

      navigation.navigate(
         "ConfigureTag",
         {
            deviceId: id,
         }
      );
   };

   return (
      <View className="flex-1 bg-slate-900">
         {/* Header */}
         <View className="px-6 pt-14">
            <TouchableOpacity
               onPress={handleBack}
               className="flex-row items-center"
               activeOpacity={0.7}
            >
               <ArrowLeft
                  size={20}
                  color="#FFFFFF"
               />

               <Text className="ml-2 text-white text-base">
                  Voltar
               </Text>
            </TouchableOpacity>
         </View>

         {/* Conteúdo */}
         <View className="flex-1 px-6 items-center justify-center">
            <View className="items-center">
               <View className="relative items-center justify-center mb-8">
                  <RippleAnimation />

                  <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center">
                     <Bluetooth
                        size={48}
                        color="#FFFFFF"
                     />
                  </View>
               </View>

               <Text className="text-white text-xl font-semibold text-center">
                  Buscando dispositivos próximos...
               </Text>

               <Text className="text-slate-400 text-center mt-3">
                  Aproxime a tag do seu dispositivo
               </Text>

               <ScanningDots />
            </View>
         </View>

         {/* Botão Dev */}
         <TouchableOpacity
            onPress={() =>
               setSimModalOpen(true)
            }
            className="absolute bottom-28 self-center bg-slate-800 border border-slate-700 rounded-full px-5 py-3"
            activeOpacity={0.8}
         >
            <Text className="text-slate-300 text-xs font-medium">
               Simular Dispositivo (Dev)
            </Text>
         </TouchableOpacity>

         {/* Modal */}
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
                     Simular Dispositivo
                  </Text>

                  <Text className="text-slate-500 mt-2 mb-4">
                     Informe um identificador para
                     continuar o fluxo.
                  </Text>

                  <TextInput
                     className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                     value={deviceId}
                     onChangeText={setDeviceId}
                     placeholder="Ex: UFTAG-2A91"
                     placeholderTextColor="#94A3B8"
                     autoCapitalize="characters"
                     autoCorrect={false}
                  />

                  <View className="flex-row mt-4">
                     <TouchableOpacity
                        className="flex-1 bg-slate-100 rounded-xl py-3 items-center mr-2"
                        onPress={() =>
                           setSimModalOpen(false)
                        }
                     >
                        <Text className="text-slate-700 font-medium">
                           Cancelar
                        </Text>
                     </TouchableOpacity>

                     <TouchableOpacity
                        className="flex-1 bg-blue-600 rounded-xl py-3 items-center ml-2"
                        onPress={handleContinue}
                     >
                        <Text className="text-white font-medium">
                           Continuar
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