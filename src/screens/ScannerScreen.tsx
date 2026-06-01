import React, { useEffect, useRef, useState } from "react";
import {
   View,
   Text,
   Animated,
   TouchableOpacity,
   StyleSheet,
   Linking,
   Alert,
   Modal,
   TextInput
} from "react-native";
import {
   ArrowLeft,
   Tag,
   User,
   Mail,
   Phone,
   Volume2
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { useAppNavigation } from "../navigation/types";
import { getPublicDevice, PublicDeviceResponse } from "../api/devices";
import { Loading } from "../components/Loading";
import { BottomNav } from "../components/BottomNav";

// Importação dinâmica do NfcManager para evitar crash caso não esteja vinculado nativamente
let NfcManager: any = null;
let NfcEvents: any = null;
try {
   const NfcLib = require("react-native-nfc-manager");
   NfcManager = NfcLib.default;
   NfcEvents = NfcLib.NfcEvents;
} catch (e) {
   console.warn("react-native-nfc-manager não pôde ser carregado:", e);
}

// Helper para decodificar Payload NFC de forma segura
function decodeNfcPayload(payload: number[] | Uint8Array | undefined): string | null {
   if (!payload || payload.length === 0) return null;

   try {
      const NfcLib = require("react-native-nfc-manager");
      if (NfcLib && NfcLib.Ndef && NfcLib.Ndef.uri) {
         return NfcLib.Ndef.uri.decodePayload(payload);
      }
   } catch (e) {
      // Ignora erro e usa fallback manual
   }

   // Decodificador Manual NDEF URI Fallback
   const prefixes: { [key: number]: string } = {
      0x01: "http://www.",
      0x02: "https://www.",
      0x03: "http://",
      0x04: "https://",
   };

   const prefixCode = payload[0];
   const prefix = prefixes[prefixCode] ?? "";

   let rest = "";
   for (let i = 1; i < payload.length; i++) {
      rest += String.fromCharCode(payload[i]);
   }

   return prefix + rest;
}

// Componente para a animação das Ondas Concêntricas
function RippleAnimation() {
   const animatedValues = [
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
   ];

   useEffect(() => {
      const createAnimation = (value: Animated.Value, delay: number) => {
         value.setValue(0);
         return Animated.loop(
            Animated.sequence([
               Animated.delay(delay),
               Animated.parallel([
                  Animated.timing(value, {
                     toValue: 1,
                     duration: 3000,
                     useNativeDriver: true,
                  }),
               ]),
            ])
         );
      };

      const anims = animatedValues.map((val, index) =>
         createAnimation(val, index * 1000)
      );
      anims.forEach((anim) => anim.start());

      return () => {
         anims.forEach((anim) => anim.stop());
      };
   }, []);

   return (
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
         {animatedValues.map((val, index) => {
            const scale = val.interpolate({
               inputRange: [0, 1],
               outputRange: [0.8, 2.8],
            });
            const opacity = val.interpolate({
               inputRange: [0, 0.2, 0.8, 1],
               outputRange: [0, 0.4, 0.25, 0],
            });

            return (
               <Animated.View
                  key={index}
                  style={{
                     transform: [{ scale }],
                     opacity,
                  }}
                  className="absolute w-44 h-44 rounded-full border border-blue-500/40"
               />
            );
         })}
      </View>
   );
}

export function ScannerScreen() {
   const navigation = useAppNavigation();
   const [state, setState] = useState<"scanning" | "loading" | "found">("scanning");
   const [device, setDevice] = useState<PublicDeviceResponse | null>(null);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   // Estados do Modal do Simulador de ID (para desenvolvimento)
   const [simModalOpen, setSimModalOpen] = useState(false);
   const [simDeviceId, setSimDeviceId] = useState("");

   // Inicializa a antena NFC e registra ouvintes
   useEffect(() => {
      let isMounted = true;

      async function initNfc() {
         if (!NfcManager) {
            console.log("NfcManager não disponível. Rodando em modo simulador.");
            return;
         }

         try {
            await NfcManager.start();

            // Configura o evento ao encontrar Tag
            NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag: any) => {
               if (!isMounted) return;

               console.log("NFC Tag descoberta:", tag);

               // Extrai payload Ndef se houver
               let payload: number[] | undefined;
               if (tag?.ndefMessage && tag.ndefMessage[0]) {
                  payload = Array.from(tag.ndefMessage[0].payload);
               }

               const url = decodeNfcPayload(payload);
               if (url) {
                  console.log("URL NFC decodificada:", url);
                  const id = extractIdFromUrl(url);
                  if (id) {
                     fetchDeviceData(id);
                  } else {
                     Alert.alert("Erro", "URL da tag NFC não contém um ID válido.");
                  }
               } else {
                  Alert.alert("Erro", "Não foi possível extrair a URL da tag NFC.");
               }
            });

            // Inicia escuta
            await NfcManager.registerTagEvent();
         } catch (e) {
            console.warn("Erro ao iniciar escuta NFC:", e);
         }
      }

      initNfc();

      return () => {
         isMounted = false;
         if (NfcManager) {
            NfcManager.unregisterTagEvent().catch(() => {});
            NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
         }
      };
   }, []);

   // Helper para extrair UUID ou ID do final da URL
   const extractIdFromUrl = (url: string): string | null => {
      try {
         // Tenta pegar id após /public/
         const publicMatch = url.match(/\/public\/([a-zA-Z0-9-]+)/);
         if (publicMatch && publicMatch[1]) {
            return publicMatch[1];
         }
         // Tenta pegar o último segmento da URL
         const lastSegment = url.split("/").pop();
         return lastSegment ? lastSegment.trim() : null;
      } catch (e) {
         return null;
      }
   };

   // Executa chamada da API pública para buscar informações do proprietário
   const fetchDeviceData = async (id: string) => {
      setState("loading");
      setErrorMsg(null);

      try {
         const result = await getPublicDevice(id);
         if (result.ok) {
            setDevice(result.data);
            setState("found");
         } else {
            setErrorMsg(result.error || "Não foi possível carregar a tag.");
            setState("scanning");
            Alert.alert("Erro", result.error || "Dispositivo inativo ou não encontrado.");
         }
      } catch (err) {
         setErrorMsg("Erro de conexão com o servidor.");
         setState("scanning");
         Alert.alert("Erro", "Erro ao conectar com a API.");
      }
   };

   // Reseta tela de volta para o modo Scanner
   const handleBackToScan = () => {
      setDevice(null);
      setErrorMsg(null);
      setState("scanning");
   };

   // Executa ação de entrar em contato baseado nos campos retornados
   const handleContact = () => {
      if (!device) return;

      if (device.PhoneNumber) {
         Linking.openURL(`tel:${device.PhoneNumber.replace(/\D/g, "")}`);
      } else if (device.Email) {
         Linking.openURL(`mailto:${device.Email}`);
      } else {
         Alert.alert("Aviso", "Nenhuma informação de contato disponível.");
      }
   };

   // Simula leitura de tag digitando um ID direto (para desenvolvimento)
   const handleSimulateScan = () => {
      if (!simDeviceId.trim()) {
         Alert.alert("Aviso", "Digite um ID de dispositivo válido.");
         return;
      }
      setSimModalOpen(false);
      fetchDeviceData(simDeviceId.trim());
   };

   // --- RENDER VISÃO SCANNING (TELA AZUL) ---
   if (state === "scanning") {
      return (
         <View className="flex-1 bg-[#0A1120] justify-center items-center px-6">
            {/* Animação das Ondas */}
            <RippleAnimation />

            {/* Ícone NFC central com waves brancas */}
            <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center shadow-2xl shadow-blue-500/50 z-10">
               <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                  {/* Wi-fi/NFC Waves */}
                  <Path
                     d="M2 12C2 9.24 3.12 6.74 4.93 4.93"
                     stroke="#FFFFFF"
                     strokeWidth={3}
                     strokeLinecap="round"
                  />
                  <Path
                     d="M6 12C6 10.34 6.67 8.84 7.76 7.76"
                     stroke="#FFFFFF"
                     strokeWidth={3}
                     strokeLinecap="round"
                  />
                  <Path
                     d="M10 12C10 11.45 10.22 10.95 10.59 10.59"
                     stroke="#FFFFFF"
                     strokeWidth={3}
                     strokeLinecap="round"
                  />
                  <Path
                     d="M22 12C22 14.76 20.88 17.26 19.07 19.07"
                     stroke="#FFFFFF"
                     strokeWidth={3}
                     strokeLinecap="round"
                     transform="rotate(180 12 12)"
                  />
                  <Path
                     d="M18 12C18 13.66 17.33 15.16 16.24 16.24"
                     stroke="#FFFFFF"
                     strokeWidth={3}
                     strokeLinecap="round"
                     transform="rotate(180 12 12)"
                  />
                  <Path
                     d="M14 12C14 12.55 13.78 13.05 13.41 13.41"
                     stroke="#FFFFFF"
                     strokeWidth={3}
                     strokeLinecap="round"
                     transform="rotate(180 12 12)"
                  />
               </Svg>
            </View>

            {/* Textos Informativos */}
            <View className="items-center mt-12 z-10">
               <Text className="text-white text-2xl font-bold">Scanner NFC</Text>
               <Text className="text-slate-400 text-sm text-center mt-2 px-6">
                  Aproxime a tag do aparelho para ler as informações.
               </Text>
            </View>

            {/* Animação dos Três Pontos */}
            <View className="flex-row gap-2 mt-8 z-10">
               <Text className="text-blue-500 text-lg font-bold">...</Text>
            </View>

            {/* Botão de Simulação (Apenas Dev/Ambiente Local) */}
            <TouchableOpacity
               onPress={() => setSimModalOpen(true)}
               className="absolute bottom-28 bg-slate-800/80 px-5 py-3 rounded-full border border-slate-700/60 z-10"
               activeOpacity={0.7}
            >
               <Text className="text-slate-300 text-xs font-semibold">Simular Leitura (Dev)</Text>
            </TouchableOpacity>

            {/* Modal do Simulador */}
            <Modal
               visible={simModalOpen}
               transparent
               animationType="fade"
               onRequestClose={() => setSimModalOpen(false)}
            >
               <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "center", alignItems: "center", padding: 20 }}>
                  <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
                     <Text className="text-slate-900 text-lg font-bold mb-2">Simulador de Leitura NFC</Text>
                     <Text className="text-slate-500 text-xs mb-4">Insira o ID da Tag/Dispositivo para buscar na API:</Text>
                     <TextInput
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4"
                        placeholder="Ex: cde2d9b2-3c81..."
                        placeholderTextColor="#94A3B8"
                        value={simDeviceId}
                        onChangeText={setSimDeviceId}
                        autoCapitalize="none"
                        autoCorrect={false}
                     />
                     <View className="flex-row gap-3">
                        <TouchableOpacity
                           onPress={() => setSimModalOpen(false)}
                           className="flex-1 bg-slate-100 py-3 rounded-xl items-center"
                        >
                           <Text className="text-slate-600 text-sm font-semibold">Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                           onPress={handleSimulateScan}
                           className="flex-1 bg-blue-600 py-3 rounded-xl items-center"
                        >
                           <Text className="text-white text-sm font-semibold">Confirmar</Text>
                        </TouchableOpacity>
                     </View>
                  </View>
               </View>
            </Modal>

            {/* Menu de Navegação Inferior */}
            <BottomNav />
         </View>
      );
   }

   // --- RENDER VISÃO CARREGANDO ---
   if (state === "loading") {
      return (
         <View className="flex-1 bg-slate-50 justify-center items-center">
            <Loading message="Buscando informações da tag na API..." />
         </View>
      );
   }

   // --- RENDER VISÃO ENCONTRADO (TELA BRANCA COM CARD) ---
   return (
      <View className="flex-1 bg-[#F8FAFC]">
         {/* Botão de Voltar */}
         <View className="px-5 pt-14 pb-2">
            <TouchableOpacity
               onPress={handleBackToScan}
               className="flex-row items-center gap-2 self-start"
               activeOpacity={0.7}
            >
               <ArrowLeft size={20} color="#64748B" />
               <Text className="text-slate-500 text-base font-medium">Voltar</Text>
            </TouchableOpacity>
         </View>

         {/* Header de Sucesso */}
         <View className="items-center px-6 mt-6">
            <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/20">
               <User size={38} color="#FFFFFF" />
            </View>
            <Text className="text-slate-900 text-2xl font-bold mt-4">Tag Encontrada!</Text>
            <Text className="text-slate-400 text-sm mt-1">Informações do proprietário</Text>
         </View>

         {/* Card com Detalhes da Tag */}
         <View className="px-5 mt-6 items-center">
            <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 max-w-sm w-full">
               {/* Item: Nome da Tag */}
               <View className="flex-row items-start gap-4 border-b border-slate-100 pb-4 mb-4">
                  <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                     <Tag size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                     <Text className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Nome da Tag</Text>
                     <Text className="text-slate-800 text-base font-bold mt-1">
                        {device?.NameDevice || "Não fornecido"}
                     </Text>
                  </View>
               </View>

               {/* Item: Proprietário */}
               <View className="flex-row items-start gap-4 border-b border-slate-100 pb-4 mb-4">
                  <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                     <User size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                     <Text className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Proprietário</Text>
                     <Text className="text-slate-800 text-base font-bold mt-1">
                        {device?.NameUser || "Não fornecido"}
                     </Text>
                  </View>
               </View>

               {/* Item: E-mail */}
               {device?.Email ? (
                  <View className="flex-row items-start gap-4 border-b border-slate-100 pb-4 mb-4">
                     <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                        <Mail size={20} color="#3B82F6" />
                     </View>
                     <View className="flex-1">
                        <Text className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Email</Text>
                        <Text className="text-slate-600 text-sm mt-1 break-all">
                           {device.Email}
                        </Text>
                     </View>
                  </View>
               ) : null}

               {/* Item: Telefone */}
               {device?.PhoneNumber ? (
                  <View className="flex-row items-start gap-4 pb-2">
                     <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                        <Phone size={20} color="#3B82F6" />
                     </View>
                     <View className="flex-1">
                        <Text className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Telefone</Text>
                        <Text className="text-slate-600 text-sm mt-1">
                           {device.PhoneNumber}
                        </Text>
                     </View>
                  </View>
               ) : null}

               {/* Botão de Ação */}
               <TouchableOpacity
                  onPress={handleContact}
                  className="bg-blue-600 py-4 rounded-2xl items-center mt-6 shadow-md shadow-blue-500/20"
                  activeOpacity={0.8}
               >
                  <Text className="text-white text-base font-semibold">Entrar em Contato</Text>
               </TouchableOpacity>
            </View>
         </View>
      </View>
   );
}
