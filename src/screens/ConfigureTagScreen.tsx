import React, { useState } from "react";
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
   X,
} from "lucide-react-native";

import { useRoute } from "@react-navigation/native";
import { useAppNavigation } from "../navigation/types";
import { deriveKey, generateSalt } from "../crypto/kdf";
import { getPassword } from "../storage/tokenStorage";
import { generateKeyPair } from "../crypto/keypair";
import { encryptWithMasterKey } from "../crypto/symmetric";
import { CreateDeviceRequest, createDevice } from "../api/devices";
import { Buffer } from "buffer";
import { saveDevices } from "../storage/devicesStorage";

import { bleManager } from "../services/BleManager";

const STEPS = [
   "Preparando ambiente",
   "Criando chaves criptográficas",
   "Sincronizando com a Tag",
   "Registrando na nuvem",
   "Finalização",
];

// UUIDs convertidos para o formato 128-bits exigido pelo React Native
const UFTAG_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const UFTAG_CHAR_SETKEY_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";

type RouteParams = {
   deviceId: string;
   bleMacAddress: string;
};

export function ConfigureTagScreen() {
   const navigation = useAppNavigation();
   const route = useRoute();

   const { deviceId, bleMacAddress } = route.params as RouteParams;

   const [tagName, setTagName] = useState("");
   const [nameError, setNameError] = useState(""); // Novo estado para feedback de validação
   const [configuring, setConfiguring] = useState(false);
   const [currentStep, setCurrentStep] = useState(0);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   // Função de validação em tempo real
   const handleNameChange = (text: string) => {
      setTagName(text);
      if (text.length > 0 && text.trim().length < 2) {
         setNameError("O nome deve ter pelo menos 2 caracteres.");
      } else if (text.length > 100) {
         setNameError("O nome deve ter no máximo 100 caracteres.");
      } else {
         setNameError("");
      }
   };

   const handleConfigure = async () => {
      const name = tagName.trim();
      if (name.length < 2 || name.length > 100) return;

      setConfiguring(true);
      setErrorMsg(null);
      setCurrentStep(0);

      try {
         // Etapa 0: Preparando
         await new Promise<void>((resolve) => setTimeout(resolve, 600));

         // Etapa 1: Chaves Criptográficas
         setCurrentStep(1);

         const salt = generateSalt();
         const password = await getPassword();

         if (!password) {
            throw new Error("Credenciais não encontradas. Faça login novamente.");
         }

         const masterKey = await deriveKey(password, salt);
         const pair = await generateKeyPair();
         const encryptedData = encryptWithMasterKey(pair, masterKey);

         // Etapa 2: Sincronizando com a Tag
         setCurrentStep(2);

         const publicKeyBase64 = Buffer.from(pair.publicKey).toString("base64");

         console.log(`[ConfigureTag] Gravando chave pública na Tag ${deviceId} via BLE...`);
         console.log(`[ConfigureTag] Chave pública: ${pair.publicKey}`);
         console.log(`[ConfigureTag] Chave pública (base64): ${publicKeyBase64}`);

         try {
            await bleManager.writeCharacteristicWithResponseForDevice(
               bleMacAddress,
               UFTAG_SERVICE_UUID,
               UFTAG_CHAR_SETKEY_UUID,
               publicKeyBase64
            );
         } catch (bleError: any) {
            const isIntentionalDisconnect =
               bleError.message?.includes("disconnected") || bleError.errorCode === 201;

            if (!isIntentionalDisconnect) {
               console.error("Erro BLE:", bleError);
               throw new Error("Falha ao gravar a chave de segurança na Tag.");
            }
         }

         // Etapa 3: API
         setCurrentStep(3);

         const request: CreateDeviceRequest = {
            Name: name,
            PublicId: deviceId,
            EncryptedPublicKey: encryptedData.publicKeyEncrypted,
            EncryptedPrivateKey: encryptedData.privateKeyEncrypted,
            KeysSalt: Buffer.from(salt).toString("base64"),
         };

         const response = await createDevice(request);

         if (!response.ok) {
            throw new Error(response.error || "Falha ao registrar dispositivo na nuvem.");
         }

         // Etapa 3: Finalização (Sucesso)
         setCurrentStep(3);

         await saveDevices([response.data]);

         setTimeout(() => {
            navigation.navigate("Home");
         }, 2000);

      } catch (error: any) {
         setErrorMsg(error.message || "Ocorreu um erro inesperado.");
      }
   };

   const handleBack = () => {
      navigation.goBack();
   };

   const resetState = () => {
      setConfiguring(false);
      setCurrentStep(0);
      setErrorMsg(null);
   };

   if (configuring) {
      return (
         <View className="flex-1 bg-slate-900 justify-center px-6">
            <View className="items-center mb-12">
               <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${errorMsg ? 'bg-red-500' : 'bg-blue-600'
                  }`}>
                  <Tag size={40} color="#FFFFFF" />
               </View>

               <Text className="text-xl font-semibold text-white">
                  {errorMsg ? "Falha na Configuração" : "Configurando Tag"}
               </Text>

               <Text className="text-slate-400 text-center mt-2">
                  {errorMsg
                     ? "O processo foi interrompido devido a um erro."
                     : "Aguarde enquanto configuramos sua tag"}
               </Text>
            </View>

            <View>
               {STEPS.map((stepLabel, index) => {
                  const isPast = index < currentStep;
                  const isActive = index === currentStep;
                  const isFuture = index > currentStep;

                  // Estilização das bordas
                  let borderClass = "bg-white/5 border-white/10";
                  if (isPast || isActive) {
                     borderClass = "bg-white/10 border-white/20";
                  }

                  // Configuração do ícone e cores
                  let bgClass = "bg-slate-600";
                  let IconInner = <Text className="text-white font-semibold">{index + 1}</Text>;

                  if (isPast) {
                     bgClass = "bg-green-500";
                     IconInner = <Check size={20} color="#FFFFFF" />;
                  } else if (isActive) {
                     if (errorMsg) {
                        bgClass = "bg-red-500";
                        IconInner = <X size={20} color="#FFFFFF" />;
                     } else if (index === STEPS.length - 1) {
                        bgClass = "bg-green-500";
                        IconInner = <Check size={20} color="#FFFFFF" />;
                     } else {
                        bgClass = "bg-blue-600";
                     }
                  }

                  // Configuração do texto
                  let textLabel = stepLabel;
                  if (isActive && errorMsg) {
                     textLabel = `Erro: ${errorMsg}`;
                  } else if (isActive && index === STEPS.length - 1 && !errorMsg) {
                     textLabel = "Tag configurada com sucesso!";
                  }

                  return (
                     <View
                        key={index}
                        className={`flex-row items-center rounded-2xl p-4 mb-4 border ${borderClass} ${isFuture ? 'opacity-50' : 'opacity-100'
                           }`}
                     >
                        <View className={`w-10 h-10 rounded-full items-center justify-center ${bgClass}`}>
                           {IconInner}
                        </View>

                        <Text
                           className={`ml-4 text-base flex-1 ${isPast || isActive ? "text-white" : "text-slate-500"
                              }`}
                           numberOfLines={2}
                        >
                           {textLabel}
                        </Text>
                     </View>
                  );
               })}
            </View>

            {errorMsg && (
               <TouchableOpacity
                  onPress={resetState}
                  className="bg-white/10 border border-white/20 rounded-2xl py-4 items-center mt-8"
               >
                  <Text className="text-white font-semibold text-base">
                     Tentar Novamente
                  </Text>
               </TouchableOpacity>
            )}
         </View>
      );
   }

   // Validação para desabilitar o botão
   const isButtonDisabled = !tagName.trim() || tagName.trim().length < 2 || tagName.length > 100;

   return (
      <View className="flex-1 bg-slate-50">
         <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            <TouchableOpacity
               onPress={handleBack}
               className="flex-row items-center mt-14 mx-6"
               activeOpacity={0.7}
            >
               <ArrowLeft size={20} color="#475569" />
               <Text className="ml-2 text-slate-600">Voltar</Text>
            </TouchableOpacity>

            <View className="px-6 pt-12">
               <View className="items-center mb-8">
                  <View className="w-20 h-20 rounded-3xl bg-blue-600 items-center justify-center mb-4">
                     <Tag size={40} color="#FFFFFF" />
                  </View>

                  <Text className="text-2xl font-semibold text-slate-900">
                     Configurar Tag
                  </Text>

                  <Text className="text-slate-500 text-center mt-2">
                     Dê um nome para sua nova tag
                  </Text>
               </View>

               <View className="bg-white rounded-3xl p-8 shadow-sm">
                  <View>
                     <Text className="text-sm text-slate-500 mb-2">
                        Nome da Tag
                     </Text>

                     <TextInput
                        value={tagName}
                        onChangeText={handleNameChange}
                        placeholder="Ex: Mochila Azul"
                        placeholderTextColor="#94A3B8"
                        className={`border rounded-xl px-4 py-4 text-slate-900 ${nameError ? 'border-red-400 bg-red-50' : 'border-slate-200'
                           }`}
                     />

                     {/* Feedback visual de erro */}
                     {!!nameError && (
                        <Text className="text-red-500 text-xs mt-2 ml-1">
                           {nameError}
                        </Text>
                     )}
                  </View>

                  <View className="mt-4">
                     <Text className="text-xs text-slate-400">
                        Dispositivo: {deviceId}
                     </Text>
                  </View>

                  <TouchableOpacity
                     onPress={handleConfigure}
                     disabled={isButtonDisabled}
                     className={`rounded-2xl py-4 items-center mt-8 ${!isButtonDisabled ? "bg-blue-600" : "bg-slate-300"
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