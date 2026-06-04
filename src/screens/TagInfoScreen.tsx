import React, { useEffect, useState, useCallback } from "react";
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
import Svg, { Path } from "react-native-svg";

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

   const loadDevice = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);

         const result = await getPublicDevice(deviceId);

         if (result.ok) {
            setDevice(result.data);
         }
      } catch {
         setError("Não foi possível conectar ao servidor.");
      } finally {
         setLoading(false);
      }
   }, [deviceId]);

   useEffect(() => {
      loadDevice();
   }, [loadDevice]);

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
   const isNetworkError = error && error.includes("conectar");

   return (
      <View className="flex-1 bg-slate-50 px-6">
         {/* Botão Voltar (comum para as duas telas) */}
         <TouchableOpacity
            onPress={handleBack}
            className="flex-row items-center mt-14 mb-6"
            activeOpacity={0.7}
         >
            <ArrowLeft size={20} color="#475569" />
            <Text className="ml-2 text-slate-600 text-base">Voltar</Text>
         </TouchableOpacity>

         {isNetworkError ? (
            <View className="flex-1 items-center justify-center">
               <View className="w-24 h-24 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 shadow-sm">
                  <CircleAlert size={48} color="#d97706" />
               </View>
               <Text className="text-2xl font-semibold text-slate-900 mt-6">
                  Falha na Conexão
               </Text>
               <Text className="text-slate-500 text-center mt-3 max-w-xs leading-relaxed">
                  Não foi possível estabelecer comunicação com o servidor. Verifique sua internet.
               </Text>
               <TouchableOpacity
                  onPress={handleBack}
                  className="bg-blue-600 rounded-2xl py-4 px-8 mt-8 w-full items-center shadow-md shadow-blue-500/10"
               >
                  <Text className="text-white font-semibold">Tentar novamente</Text>
               </TouchableOpacity>
            </View>
         ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 40 }}>
               
               <View className="items-center mb-8 text-center">
                  <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/20">
                     {/* Ícone de Interrogação em SVG */}
                     <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                        <Path 
                           d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                           stroke="#FFFFFF" 
                           strokeWidth={2.5} 
                           strokeLinecap="round" 
                           strokeLinejoin="round" 
                        />
                     </Svg>
                  </View>
                  <Text className="text-2xl font-bold text-slate-900 mt-4 tracking-tight">
                     Tag Sem Proprietário
                  </Text>
                  <Text className="text-slate-500 text-sm mt-2">
                     Esta tag ainda não foi registrada no UFTag
                  </Text>
               </View>

               <View className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm mb-6">
                  <Text className="text-slate-600 text-sm leading-relaxed text-center">
                     Se você acabou de adquirir esta tag, ela está pronta para ser cadastrada!
                  </Text>

                  <View className="border-t border-slate-100 pt-6 mt-6">
                     <Text className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-center mb-4">
                        Como Registrar esta Tag
                     </Text>
                     
                     
                     <View className="flex-row gap-3 items-center mb-4">
                        <View className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                           <Text className="text-xs font-bold text-blue-600">1</Text>
                        </View>
                        <Text className="text-sm text-slate-600 flex-1">
                           Acesse a opção de adicionar novo dispositivo/tag.
                        </Text>
                     </View>

                     <View className="flex-row gap-3 items-center">
                        <View className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                           <Text className="text-xs font-bold text-blue-600">2</Text>
                        </View>
                        <Text className="text-sm text-slate-600 flex-1">
                           Realize o pareamento da tag via bluetooth.
                        </Text>
                     </View>
                  </View>
               </View>

               {/* Botão de rodapé para voltar a escanear */}
               <TouchableOpacity
                  onPress={handleBack}
                  className="bg-blue-600 rounded-2xl py-4 px-8 items-center w-full shadow-md shadow-blue-500/10"
                  activeOpacity={0.8}
               >
                  <Text className="text-white font-semibold text-base">
                     Escanear novamente
                  </Text>
               </TouchableOpacity>

            </ScrollView>
         )}
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