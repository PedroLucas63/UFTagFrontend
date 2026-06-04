import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Battery, MapPin, Clock } from "lucide-react-native";

interface TagCardProps {
   name: string;
   battery: number | null;
   location: string;
   lastUpdate: string | null;
   isNear: boolean;
   onClick?: () => void;
}

export function TagCard({
   name,
   battery,
   location,
   lastUpdate,
   isNear,
   onClick,
}: TagCardProps) {
   if (battery === null) {
      battery = 0; // ou algum valor padrão para indicar que a bateria é desconhecida
   }

   const batteryColor =
      battery > 50
         ? "#22C55E"
         : battery > 20
            ? "#EAB308"
            : "#EF4444";

   return (
      <TouchableOpacity
         onPress={onClick}
         activeOpacity={0.8}
         className="bg-white rounded-2xl p-4 border border-slate-100"
      >
         {/* Header */}
         <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
               <Text className="text-slate-900 text-base font-semibold">
                  {name}
               </Text>

               <View
                  className={`flex-row items-center gap-2 px-2 py-1 rounded-full mt-2 self-start ${isNear ? "bg-green-100" : "bg-red-100"
                     }`}
               >
                  <View
                     className={`w-2 h-2 rounded-full ${isNear ? "bg-green-500" : "bg-red-500"
                        }`}
                  />
                  <Text
                     className={`text-xs font-medium ${isNear ? "text-green-700" : "text-red-700"
                        }`}
                  >
                     {isNear ? "Próxima" : "Distante"}
                  </Text>
               </View>
            </View>

            {/* Battery */}
            <View className="flex-row items-center gap-2">
               <Battery size={20} color={batteryColor} />
               <Text className="text-sm font-medium text-slate-700">
                  {battery}%
               </Text>
            </View>
         </View>

         {/* Info */}
         <View className="gap-2">
            <View className="flex-row items-center gap-2">
               <MapPin size={16} color="#64748B" />
               <Text className="text-sm text-slate-500">{location}</Text>
            </View>

            <View className="flex-row items-center gap-2">
               <Clock size={16} color="#64748B" />
               <Text className="text-sm text-slate-500">
                  Última atualização: {lastUpdate}
               </Text>
            </View>
         </View>
      </TouchableOpacity>
   );
}