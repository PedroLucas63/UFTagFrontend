import React, { useState } from 'react';
import {
   View,
   Text,
   TouchableOpacity,
   TextInput,
   ScrollView,
   Modal,
   Alert
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

const buzzerSteps = [
   { icon: Volume2, text: 'Conectando...', color: 'text-slate-400', iconColor: '#94a3b8' },
   { icon: Volume2, text: 'Conexão estabelecida', color: 'text-blue-600', iconColor: '#2563eb' },
   { icon: Volume2, text: 'Buzzer acionado!', color: 'text-green-500', iconColor: '#22c55e' },
];

type TagDetailsRouteProp = RouteProp<RootStackParamList, 'TagDetails'>;
type TagDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TagDetails'>;

export function TagDetailsScreen() {
   const navigation = useNavigation<TagDetailsNavigationProp>();
   const route = useRoute<TagDetailsRouteProp>();

   const tag = route.params.tag;

   const [isEditing, setIsEditing] = useState(false);
   const [tagName, setTagName] = useState(tag.name);
   const [showBuzzerModal, setShowBuzzerModal] = useState(false);
   const [buzzerStep, setBuzzerStep] = useState(0);
   const [showRadar, setShowRadar] = useState(false);

   const handleSaveName = () => {
      setIsEditing(false);
      Alert.alert('Sucesso', 'Nome alterado com sucesso!');
   };

   const handleBuzzer = () => {
      setShowBuzzerModal(true);
      setBuzzerStep(0);

      setTimeout(() => setBuzzerStep(1), 600);
      setTimeout(() => setBuzzerStep(2), 1200);
      setTimeout(() => {
         setBuzzerStep(3);
         setTimeout(() => setShowBuzzerModal(false), 800);
      }, 1800);
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
                           className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-slate-900"
                        />
                        <TouchableOpacity
                           onPress={handleSaveName}
                           className="bg-blue-600 px-5 py-3 rounded-xl"
                        >
                           <Text className="text-white font-semibold">Salvar</Text>
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
                        <Text className="font-semibold text-slate-900">Hoje às {tag.lastUpdate}</Text>
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
                     <Text className="text-white font-semibold text-base">Acionar Buzzer</Text>
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

         {/* Modal do Buzzer */}
         <Modal transparent visible={showBuzzerModal} animationType="fade">
            <View className="flex-1 bg-black/50 justify-center items-center p-6">
               <View className="bg-white rounded-3xl p-8 w-full max-w-sm items-center">
                  {buzzerStep < 3 ? (
                     <>
                        <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${buzzerStep === 0 ? 'bg-slate-100' : buzzerStep === 1 ? 'bg-blue-100' : 'bg-green-100'
                           }`}>
                           {React.createElement(buzzerSteps[buzzerStep].icon, {
                              size: 40,
                              color: buzzerSteps[buzzerStep].iconColor
                           })}
                        </View>
                        <Text className={`text-lg font-semibold ${buzzerSteps[buzzerStep].color}`}>
                           {buzzerSteps[buzzerStep].text}
                        </Text>
                     </>
                  ) : (
                     <>
                        <View className="w-20 h-20 rounded-full bg-green-500 items-center justify-center mb-4">
                           <Volume2 size={40} color="white" />
                        </View>
                        <Text className="text-lg font-semibold text-green-500">
                           Buzzer acionado!
                        </Text>
                     </>
                  )}
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
                     {/* Círculos */}
                     <View className="absolute inset-0 border-2 border-blue-600/30 rounded-full" />
                     <View className="absolute w-56 h-56 border-2 border-blue-600/30 rounded-full" />
                     <View className="absolute w-40 h-40 border-2 border-blue-600/30 rounded-full" />
                     <View className="absolute w-24 h-24 border-2 border-blue-600/30 rounded-full" />

                     {/* Linhas cruzadas */}
                     <View className="absolute w-full h-0.5 bg-blue-600/30" />
                     <View className="absolute h-full w-0.5 bg-blue-600/30" />

                     {/* Centro (Você) */}
                     <View className="w-4 h-4 bg-white rounded-full shadow-lg" />

                     {/* Tag Detectada */}
                     <View className="absolute" style={{ top: '35%', left: '60%' }}>
                        <View className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg" />
                        <View className="absolute -top-8 -left-6 bg-green-500 px-2 py-1 rounded-md">
                           <Text className="text-white text-xs font-bold">{tagName}</Text>
                        </View>
                     </View>
                  </View>

                  {/* Status do Radar */}
                  <View className="mt-16 items-center">
                     <Text className="text-green-500 font-bold text-lg mb-1">Sinal Forte</Text>
                     <Text className="text-slate-400 text-sm">RSSI: -45 dBm</Text>
                     <Text className="text-slate-400 text-sm">Distância estimada: ~2m</Text>
                  </View>
               </View>
            </View>
         </Modal>
      </View>
   );
}