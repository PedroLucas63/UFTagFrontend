import React, { useState, useEffect } from 'react';
import {
   View,
   Text,
   TouchableOpacity,
   TextInput,
   ScrollView,
   Modal,
   Alert,
   Vibration
} from 'react-native';
import {
   ArrowLeft,
   Battery,
   MapPin,
   Clock,
   Edit2,
   Volume2,
   Radar,
   Map as MapIcon
} from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLiveDevice } from '../storage/devicesStorage';

const alertSteps = [
   { icon: Volume2, text: 'Conectando...', color: 'text-slate-400', iconColor: '#94a3b8' },
   { icon: Volume2, text: 'Conexão estabelecida', color: 'text-blue-600', iconColor: '#2563eb' },
   { icon: Volume2, text: 'Alerta acionado!', color: 'text-green-500', iconColor: '#22c55e' },
];

import { formatRelativeTime } from '../utils/dateUtils';
import { renameTagAndSyncBle, triggerTagAlert } from '../services/TagRenameService';

type TagDetailsRouteProp = RouteProp<RootStackParamList, 'TagDetails'>;
type TagDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TagDetails'>;

export function TagDetailsScreen() {
   const navigation = useNavigation<TagDetailsNavigationProp>();
   const route = useRoute<TagDetailsRouteProp>();

   const initialTag = route.params.tag;
   const tag = useLiveDevice(initialTag.id) || initialTag;

   const [isEditing, setIsEditing] = useState(false);
   const [isSavingName, setIsSavingName] = useState(false);
   const [tagName, setTagName] = useState(tag.name);
   const [showBuzzerModal, setShowBuzzerModal] = useState(false);
   const [buzzerStep, setBuzzerStep] = useState(0);
   const [showRadar, setShowRadar] = useState(false);
   const [beepActive, setBeepActive] = useState(false);

   // Parse do RSSI do dispositivo
   const rssiVal = tag.rssi && tag.rssi !== '-' ? parseInt(tag.rssi, 10) : null;

   // Lógica de feedback físico (vibração) e visual em sintonia com a proximidade
   useEffect(() => {
      if (!showRadar || rssiVal === null) {
         setBeepActive(false);
         return;
      }

      // Proximidade determina o intervalo do aviso físico/visual:
      // -50 dBm (muito perto) -> 200ms
      // -100 dBm (limite/longe) -> 1600ms
      const minInterval = 200;
      const maxInterval = 1600;
      const numericRssi = Math.max(-100, Math.min(-50, rssiVal));
      const ratio = (-50 - numericRssi) / 50; // 0 (perto) até 1 (longe)
      const intervalMs = minInterval + ratio * (maxInterval - minInterval);

      const intervalId = setInterval(() => {
         Vibration.vibrate(40);
         setBeepActive(true);
         setTimeout(() => setBeepActive(false), 80);
      }, intervalMs);

      return () => {
         clearInterval(intervalId);
      };
   }, [showRadar, rssiVal]);

   // Cálculo da posição no Radar
   const minRssi = -100;
   const maxRssi = -50;
   const numericRssiForRadar = rssiVal !== null ? Math.max(minRssi, Math.min(maxRssi, rssiVal)) : -100;
   const distanceRatio = (maxRssi - numericRssiForRadar) / (maxRssi - minRssi);

   const angle = Math.PI / 4; // 45 graus
   const maxRadius = 120; // Raio máximo utilizável no container w-72 (288px)
   const radius = distanceRatio * maxRadius;

   const xOffset = radius * Math.cos(angle);
   const yOffset = radius * Math.sin(angle);

   // Posições X e Y centralizadas no container de 288x288 pixels (metade é 144)
   // Ajustamos 12px que é a metade do tamanho da bolinha (w-6 = 24px)
   const dotLeft = 144 + xOffset - 12;
   const dotTop = 144 - yOffset - 12;

   // Status dinâmico
   let signalStatus = 'Buscando Sinal...';
   let signalColor = 'text-slate-500';
   let distanceText = 'Aguardando atualização de sinal';

   if (rssiVal !== null) {
      const distance = Math.pow(10, ((-60 - rssiVal) / 20));
      distanceText = `~${distance.toFixed(1)}m`;

      if (rssiVal >= -60) {
         signalStatus = 'Muito Próximo (Sinal Forte)';
         signalColor = 'text-green-500';
      } else if (rssiVal >= -75) {
         signalStatus = 'Próximo (Sinal Médio)';
         signalColor = 'text-yellow-500';
      } else if (rssiVal >= -90) {
         signalStatus = 'Longe (Sinal Fraco)';
         signalColor = 'text-orange-500';
      } else {
         signalStatus = 'Muito Longe (Sinal Muito Fraco)';
         signalColor = 'text-red-500';
      }
   }

    const handleSaveName = async () => {
       const name = tagName.trim();
       if (name.length < 2 || name.length > 12) {
          Alert.alert("Erro", "O nome deve conter entre 2 e 12 caracteres.");
          return;
       }

       setIsSavingName(true);
       try {
          await renameTagAndSyncBle(tag.id, name);
          setIsEditing(false);
          Alert.alert("Sucesso", "Nome alterado e sincronizado com a Tag!");
       } catch (err: any) {
          console.error("[TagDetails] Falha ao renomear dispositivo:", err);
          Alert.alert("Erro de Sincronização", err.message || "Não foi possível sincronizar o novo nome com a Tag.");
       } finally {
          setIsSavingName(false);
       }
    };

   const handleBuzzer = async () => {
      setShowBuzzerModal(true);
      setBuzzerStep(0);

      try {
         await triggerTagAlert(tag.id, 5000, () => {
            setBuzzerStep(1);
         });
         setBuzzerStep(2);
         setTimeout(() => {
            setShowBuzzerModal(false);
         }, 2000);
      } catch (err: any) {
         console.error("[TagDetails] Falha ao acionar alerta:", err);
         Alert.alert("Falha de Comunicação", err.message || "Não foi possível acionar o alerta na Tag.");
         setShowBuzzerModal(false);
      }
   };

   // Cores dinâmicas da bateria
   const getBatteryColor = () => {
      if (tag.battery === null) return { text: 'text-gray-500', bg: 'bg-gray-300', hex: '#d1d5db' };
      if (tag.battery > 50) return { text: 'text-green-500', bg: 'bg-green-500', hex: '#22c55e' };
      if (tag.battery > 20) return { text: 'text-yellow-500', bg: 'bg-yellow-500', hex: '#eab308' };
      return { text: 'text-red-500', bg: 'bg-red-500', hex: '#ef4444' };
   };

   const batteryColor = getBatteryColor();

   return (
      <View className="flex-1 bg-slate-50">
         {/* Header */}
         <View className="bg-white border-b border-gray-200 px-6 py-4 pt-14">
            <TouchableOpacity
               onPress={() => navigation.navigate('Home' as never)}
               className="flex-row items-center gap-2"
            >
               <ArrowLeft size={20} color="#4b5563" />
               <Text className="text-gray-600 text-base font-medium">Voltar</Text>
            </TouchableOpacity>
         </View>

         <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} className="flex-1">

            {/* Card de Informações Principais */}
            <View className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
               <View className="mb-6">
                  {isEditing ? (
                      <View className="flex-row items-center gap-2">
                         <TextInput
                            value={tagName}
                            onChangeText={setTagName}
                            editable={!isSavingName}
                            maxLength={12}
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-slate-900"
                         />
                         <TouchableOpacity
                            onPress={handleSaveName}
                            disabled={isSavingName}
                            className={`px-5 py-3 rounded-xl ${isSavingName ? 'bg-slate-300' : 'bg-blue-600'}`}
                         >
                            <Text className="text-white font-semibold">
                               {isSavingName ? 'Salvando...' : 'Salvar'}
                            </Text>
                         </TouchableOpacity>
                      </View>
                  ) : (
                     <View className="flex-row items-center justify-between">
                        <Text className="text-2xl font-bold text-slate-900">{tagName}</Text>
                        <TouchableOpacity
                           onPress={() => setIsEditing(true)}
                           className="p-3 bg-gray-50 rounded-xl"
                        >
                           <Edit2 size={18} color="#475569" />
                        </TouchableOpacity>
                     </View>
                  )}

                  <View className={`self-start flex-row items-center gap-2 px-3 py-1.5 rounded-full mt-3 ${tag.isNear ? 'bg-green-100' : 'bg-red-100'
                     }`}>
                     <View className={`w-2 h-2 rounded-full ${tag.isNear ? 'bg-green-500' : 'bg-red-500'}`} />
                     <Text className={`text-sm font-medium ${tag.isNear ? 'text-green-700' : 'text-red-700'}`}>
                        {tag.isNear ? 'Próxima' : 'Distante'}
                     </Text>
                  </View>
               </View>

               {/* Lista de Informações */}
               <View className="space-y-4">
                  {/* Bateria */}
                  <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl mb-3">
                     <View className="flex-row items-center gap-3">
                        <Battery size={24} color={batteryColor.hex} />
                        <View>
                           <Text className="text-xs text-gray-500">Bateria</Text>
                           <Text className="font-semibold text-slate-900">{tag.battery}%</Text>
                        </View>
                     </View>
                     <View className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                           className={`h-full ${batteryColor.bg}`}
                           style={{ width: `${tag.battery ?? 0}%` }}
                        />
                     </View>
                  </View>

                  {/* Localização */}
                  <View className="flex-row items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-3">
                     <MapPin size={24} color="#475569" />
                     <View>
                        <Text className="text-xs text-gray-500">Última localização</Text>
                        <Text className="font-semibold text-slate-900">{tag.locationText}</Text>
                     </View>
                  </View>

                  {/* Atualização */}
                  <View className="flex-row items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                     <Clock size={24} color="#475569" />
                     <View>
                        <Text className="text-xs text-gray-500">Última atualização</Text>
                        <Text className="font-semibold text-slate-900">{formatRelativeTime(tag.lastUpdate)}</Text>
                     </View>
                  </View>
               </View>
            </View>

            {/* Botões de Ação */}
            <View className="space-y-3">
               {tag.isNear && (
                  <TouchableOpacity
                     onPress={handleBuzzer}
                     className="w-full flex-row items-center justify-center gap-2 bg-blue-600 py-4 rounded-2xl mb-3"
                  >
                     <Volume2 size={20} color="white" />
                     <Text className="text-white font-semibold text-base">Acionar Alerta</Text>
                  </TouchableOpacity>
               )}

               <TouchableOpacity
                  onPress={() => setShowRadar(true)}
                  className="w-full flex-row items-center justify-center gap-2 bg-slate-200 py-4 rounded-2xl mb-3"
               >
                  <Radar size={20} color="#0f172a" />
                  <Text className="text-slate-900 font-semibold text-base">Radar de Proximidade</Text>
               </TouchableOpacity>

               <TouchableOpacity
                  onPress={() => navigation.navigate("Map" as never)}
                  className="w-full flex-row items-center justify-center gap-2 bg-slate-200 py-4 rounded-2xl"
               >
                  <MapIcon size={20} color="#0f172a" />
                  <Text className="text-slate-900 font-semibold text-base">Ver Localização Salva</Text>
               </TouchableOpacity>
            </View>
         </ScrollView>

         {/* Modal de Alerta */}
         <Modal transparent visible={showBuzzerModal} animationType="fade">
            <View className="flex-1 bg-black/50 justify-center items-center p-6">
               <View className="bg-white rounded-3xl p-8 w-full max-w-sm items-center">
                  <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${buzzerStep === 0 ? 'bg-slate-100' : buzzerStep === 1 ? 'bg-blue-100' : 'bg-green-100'
                     }`}>
                     {React.createElement(alertSteps[buzzerStep].icon, {
                        size: 40,
                        color: alertSteps[buzzerStep].iconColor
                     })}
                  </View>
                  <Text className={`text-lg font-semibold ${alertSteps[buzzerStep].color}`}>
                     {alertSteps[buzzerStep].text}
                  </Text>
               </View>
            </View>
         </Modal>

         {/* Modal do Radar */}
         <Modal transparent visible={showRadar} animationType="slide">
            <View className="flex-1 bg-slate-900 p-6 pt-14">
               <TouchableOpacity
                  onPress={() => setShowRadar(false)}
                  className="mb-8 flex-row items-center gap-2"
               >
                  <ArrowLeft size={20} color="white" />
                  <Text className="text-white text-base">Fechar</Text>
               </TouchableOpacity>

               <View className="flex-1 items-center justify-center">
                  <Text className="text-2xl text-white font-semibold mb-12">Radar de Proximidade</Text>

                  {/* Simulação do Radar na Tela Nativa */}
                  <View className="relative w-72 h-72 items-center justify-center">
                     {/* Círculos com efeito de pulso se o beep visual estiver ativo */}
                     <View className={`absolute inset-0 border-2 rounded-full ${beepActive ? 'border-blue-500/60 bg-blue-500/5' : 'border-blue-600/30'}`} />
                     <View className={`absolute w-56 h-56 border-2 rounded-full ${beepActive ? 'border-blue-500/60' : 'border-blue-600/30'}`} />
                     <View className={`absolute w-40 h-40 border-2 rounded-full ${beepActive ? 'border-blue-500/60' : 'border-blue-600/30'}`} />
                     <View className={`absolute w-24 h-24 border-2 rounded-full ${beepActive ? 'border-blue-500/60' : 'border-blue-600/30'}`} />

                     {/* Linhas cruzadas */}
                     <View className="absolute w-full h-0.5 bg-blue-600/30" />
                     <View className="absolute h-full w-0.5 bg-blue-600/30" />

                     {/* Centro (Você) */}
                     <View className="w-4 h-4 bg-white rounded-full shadow-lg" />

                     {/* Tag Detectada (Posicionada dinamicamente com base no RSSI real) */}
                     <View
                        className="absolute"
                        style={{
                           left: dotLeft,
                           top: dotTop,
                           opacity: rssiVal !== null ? 1 : 0.4
                        }}
                     >
                        <View className={`w-6 h-6 rounded-full border-2 border-white shadow-lg justify-center items-center ${rssiVal !== null ? 'bg-green-500' : 'bg-slate-500'}`}>
                           {beepActive && (
                              <View 
                                 className="absolute border border-green-400 rounded-full" 
                                 style={{ width: 40, height: 40, opacity: 0.5 }} 
                              />
                           )}
                        </View>
                        <View 
                           style={{ 
                              position: 'absolute', 
                              top: -32, 
                              left: -63, 
                              width: 150, 
                              alignItems: 'center' 
                           }}
                        >
                           <View className="bg-green-600 px-2.5 py-1 rounded-md shadow-md max-w-full">
                              <Text 
                                 className="text-white text-xs font-bold" 
                                 numberOfLines={1} 
                                 ellipsizeMode="tail"
                              >
                                 {tagName}
                              </Text>
                           </View>
                        </View>
                     </View>
                  </View>

                  {/* Status do Radar */}
                  <View className="mt-16 items-center">
                     <View className="flex-row items-center gap-2 mb-2">
                        {rssiVal !== null && (
                           <View className={`p-1.5 rounded-full ${beepActive ? 'bg-green-500/20' : 'bg-slate-800'}`}>
                              <Volume2 size={18} color={beepActive ? '#22c55e' : '#64748b'} />
                           </View>
                        )}
                        <Text className={`font-bold text-lg ${signalColor}`}>{signalStatus}</Text>
                     </View>
                     <Text className="text-slate-400 text-sm">RSSI: {rssiVal !== null ? `${rssiVal} dBm` : 'Buscando...'}</Text>
                     <Text className="text-slate-400 text-sm">Distância estimada: {distanceText}</Text>
                  </View>
               </View>
            </View>
         </Modal>
      </View>
   );
}