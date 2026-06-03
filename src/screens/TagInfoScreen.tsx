import React, { useEffect, useState } from "react";
import {
   View,
   Text,
   TouchableOpacity,
   ScrollView,
   Linking,
} from "react-native";
import {
   ArrowLeft,
   Tag,
   User,
   Mail,
   Phone,
   CircleAlert,
} from "lucide-react-native";

import { useRoute } from "@react-navigation/native";
import { useAppNavigation } from "../navigation/types";

import { getPublicDevice, PublicDeviceResponse } from "../api/devices";
import { Loading } from "../components/Loading";

type RouteParams = {
   deviceId: string;
};

export function TagInfoScreen() {
   const navigation = useAppNavigation();
   const route = useRoute();

   const { deviceId } = route.params as RouteParams;

   const [loading, setLoading] = useState(true);
   const [device, setDevice] = useState<PublicDeviceResponse | null>(null);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      loadDevice();
   }, []);

   async function loadDevice() {
      try {
         setLoading(true);
         setError(null);

         const result = await getPublicDevice(deviceId);

         if (result.ok) {
            setDevice(result.data);
         } else {
            setError(result.error ?? "Tag não encontrada.");
         }
      } catch {
         setError("Não foi possível conectar ao servidor.");
      } finally {
         setLoading(false);
      }
   }

   function handleBack() {
      navigation.navigate("Scanner");
   }

   function handleContact() {
      if (!device) return;

      if (device.phoneNumber) {
         Linking.openURL(
            `tel:${device.phoneNumber.replace(/\D/g, "")}`
         );
         return;
      }

      if (device.email) {
         Linking.openURL(`mailto:${device.email}`);
      }
   }

   if (loading) {
      return (
         <View className="flex-1 bg-slate-50 justify-center items-center">
            <Loading message="Buscando informações da tag..." />
         </View>
      );
   }

   if (!device) {
      return (
         <View className="flex-1 bg-slate-50 px-6">
            <TouchableOpacity
               onPress={handleBack}
               className="flex-row items-center mt-14 mb-6"
               activeOpacity={0.7}
            >
               <ArrowLeft size={20} color="#475569" />
               <Text className="ml-2 text-slate-600 text-base">
                  Voltar
               </Text>
            </TouchableOpacity>

            <View className="flex-1 items-center justify-center">
               <View className="w-24 h-24 rounded-full bg-red-100 items-center justify-center">
                  <CircleAlert
                     size={48}
                     color="#DC2626"
                  />
               </View>

               <Text className="text-2xl font-semibold text-slate-900 mt-6">
                  Tag não encontrada
               </Text>

               <Text className="text-slate-500 text-center mt-3 max-w-xs">
                  {error ??
                     "Não foi possível localizar informações para esta tag."}
               </Text>

               <TouchableOpacity
                  onPress={handleBack}
                  className="bg-blue-600 rounded-2xl py-4 px-8 mt-8"
                  activeOpacity={0.8}
               >
                  <Text className="text-white font-semibold">
                     Escanear novamente
                  </Text>
               </TouchableOpacity>
            </View>
         </View>
      );
   }

   return (
      <View className="flex-1 bg-slate-50 px-6">
         <TouchableOpacity
            onPress={handleBack}
            className="flex-row items-center mt-14 mb-6"
            activeOpacity={0.7}
         >
            <ArrowLeft size={20} color="#475569" />
            <Text className="ml-2 text-slate-600 text-base">
               Voltar
            </Text>
         </TouchableOpacity>

         <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
               paddingBottom: 32,
            }}
         >
            <View className="items-center mb-8">
               <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center">
                  <User
                     size={48}
                     color="#FFFFFF"
                  />
               </View>

               <Text className="text-2xl font-semibold text-slate-900 mt-4">
                  Tag Encontrada!
               </Text>

               <Text className="text-slate-500 mt-2">
                  Informações do proprietário
               </Text>
            </View>

            <View className="bg-white rounded-3xl shadow-sm p-8">
               <View>
                  <View className="flex-row items-center">
                     <Tag
                        size={20}
                        color="#64748B"
                     />

                     <Text className="ml-3 text-sm text-slate-500">
                        Nome da Tag
                     </Text>
                  </View>

                  <Text className="ml-8 mt-2 text-lg font-semibold text-slate-900">
                     {device.nameDevice || "Não informado"}
                  </Text>
               </View>

               <View className="border-t border-slate-100 pt-6 mt-6">
                  <View className="flex-row items-center">
                     <User
                        size={20}
                        color="#64748B"
                     />

                     <Text className="ml-3 text-sm text-slate-500">
                        Proprietário
                     </Text>
                  </View>

                  <Text className="ml-8 mt-2 text-lg font-semibold text-slate-900">
                     {device.nameUser || "Não informado"}
                  </Text>
               </View>

               {device.email && (
                  <View className="border-t border-slate-100 pt-6 mt-6">
                     <View className="flex-row items-center">
                        <Mail
                           size={20}
                           color="#64748B"
                        />

                        <Text className="ml-3 text-sm text-slate-500">
                           Email
                        </Text>
                     </View>

                     <Text className="ml-8 mt-2 text-slate-900">
                        {device.email}
                     </Text>
                  </View>
               )}

               {device.phoneNumber && (
                  <View className="border-t border-slate-100 pt-6 mt-6">
                     <View className="flex-row items-center">
                        <Phone
                           size={20}
                           color="#64748B"
                        />

                        <Text className="ml-3 text-sm text-slate-500">
                           Telefone
                        </Text>
                     </View>

                     <Text className="ml-8 mt-2 text-slate-900">
                        {device.phoneNumber}
                     </Text>
                  </View>
               )}

               {(device.phoneNumber || device.email) && (
                  <TouchableOpacity
                     onPress={handleContact}
                     className="bg-blue-600 rounded-2xl py-4 items-center mt-8"
                     activeOpacity={0.8}
                  >
                     <Text className="text-white font-semibold text-base">
                        Entrar em Contato
                     </Text>
                  </TouchableOpacity>
               )}
            </View>
         </ScrollView>
      </View>
   );
}