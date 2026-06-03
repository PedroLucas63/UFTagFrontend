import React, { useEffect, useState } from "react";
import {
   View,
   Text,
   TouchableOpacity,
   TextInput,
   ScrollView,
} from "react-native";

import {
   ArrowLeft,
   Tag,
   Check,
} from "lucide-react-native";

import { useRoute } from "@react-navigation/native";
import { useAppNavigation } from "../navigation/types";

const STEPS = [
   "Adicionando ao sistema",
   "Criando chaves",
   "Configurando dispositivo",
   "Pronto",
];

type RouteParams = {
   deviceId: string;
};

export function ConfigureTagScreen() {
   const navigation = useAppNavigation();
   const route = useRoute();

   const { deviceId } =
      route.params as RouteParams;

   const [tagName, setTagName] =
      useState("");

   const [configuring, setConfiguring] =
      useState(false);

   const [currentStep, setCurrentStep] =
      useState(0);

   useEffect(() => {
      if (!configuring) {
         return;
      }

      const interval = setInterval(() => {
         setCurrentStep(prev => {
            if (
               prev >=
               STEPS.length - 1
            ) {
               clearInterval(interval);

               setTimeout(() => {
                  navigation.navigate(
                     "Home"
                  );
               }, 1000);

               return prev;
            }

            return prev + 1;
         });
      }, 1500);

      return () =>
         clearInterval(interval);
   }, [configuring]);

   const handleConfigure = () => {
      if (!tagName.trim()) {
         return;
      }

      setCurrentStep(0);
      setConfiguring(true);
   };

   const handleBack = () => {
      navigation.goBack();
   };

   if (configuring) {
      return (
         <View className="flex-1 bg-slate-900 justify-center px-6">
            <View className="items-center mb-12">
               <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center mb-4">
                  <Tag
                     size={40}
                     color="#FFFFFF"
                  />
               </View>

               <Text className="text-xl font-semibold text-white">
                  Configurando Tag
               </Text>

               <Text className="text-slate-400 text-center mt-2">
                  Aguarde enquanto
                  configuramos sua tag
               </Text>
            </View>

            <View>
               {STEPS.map(
                  (
                     step,
                     index
                  ) => {
                     const completed =
                        index <
                        currentStep;

                     const active =
                        index ===
                        currentStep;

                     return (
                        <View
                           key={step}
                           className={`flex-row items-center rounded-2xl p-4 mb-4 border ${index <=
                              currentStep
                              ? "bg-white/10 border-white/20"
                              : "bg-white/5 border-white/10"
                              }`}
                        >
                           <View
                              className={`w-10 h-10 rounded-full items-center justify-center ${completed
                                 ? "bg-green-500"
                                 : active
                                    ? "bg-blue-600"
                                    : "bg-slate-600"
                                 }`}
                           >
                              {completed ? (
                                 <Check
                                    size={
                                       20
                                    }
                                    color="#FFFFFF"
                                 />
                              ) : (
                                 <Text className="text-white font-semibold">
                                    {index +
                                       1}
                                 </Text>
                              )}
                           </View>

                           <Text
                              className={`ml-4 text-base ${index <=
                                 currentStep
                                 ? "text-white"
                                 : "text-slate-500"
                                 }`}
                           >
                              {step}
                           </Text>
                        </View>
                     );
                  }
               )}
            </View>
         </View>
      );
   }

   return (
      <View className="flex-1 bg-slate-50">
         <ScrollView
            contentContainerStyle={{
               paddingBottom: 32,
            }}
         >
            <TouchableOpacity
               onPress={handleBack}
               className="flex-row items-center mt-14 mx-6"
               activeOpacity={0.7}
            >
               <ArrowLeft
                  size={20}
                  color="#475569"
               />

               <Text className="ml-2 text-slate-600">
                  Voltar
               </Text>
            </TouchableOpacity>

            <View className="px-6 pt-12">
               <View className="items-center mb-8">
                  <View className="w-20 h-20 rounded-3xl bg-blue-600 items-center justify-center mb-4">
                     <Tag
                        size={40}
                        color="#FFFFFF"
                     />
                  </View>

                  <Text className="text-2xl font-semibold text-slate-900">
                     Configurar Tag
                  </Text>

                  <Text className="text-slate-500 text-center mt-2">
                     Dê um nome para sua
                     nova tag
                  </Text>
               </View>

               <View className="bg-white rounded-3xl p-8 shadow-sm">
                  <View>
                     <Text className="text-sm text-slate-500 mb-2">
                        Nome da Tag
                     </Text>

                     <TextInput
                        value={tagName}
                        onChangeText={
                           setTagName
                        }
                        placeholder="Ex: Mochila Azul"
                        placeholderTextColor="#94A3B8"
                        className="border border-slate-200 rounded-xl px-4 py-4 text-slate-900"
                     />
                  </View>

                  <View className="mt-4">
                     <Text className="text-xs text-slate-400">
                        Dispositivo:
                        {" "}
                        {deviceId}
                     </Text>
                  </View>

                  <TouchableOpacity
                     onPress={
                        handleConfigure
                     }
                     disabled={
                        !tagName.trim()
                     }
                     className={`rounded-2xl py-4 items-center mt-8 ${tagName.trim()
                        ? "bg-blue-600"
                        : "bg-slate-300"
                        }`}
                  >
                     <Text className="text-white font-semibold text-base">
                        Configurar
                     </Text>
                  </TouchableOpacity>
               </View>
            </View>
         </ScrollView>
      </View>
   );
}