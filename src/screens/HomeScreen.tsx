import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { User, RefreshCw } from "lucide-react-native";

import { TagCard } from "../components/TagCard";
import { BottomNav } from "../components/BottomNav";
import { useAppNavigation } from "../navigation/types";
import { useLiveDevices } from "../storage/devicesStorage";
import { getDevices } from "../api/devices";

function TagCardSkeleton() {
   return (
      <View className="bg-white rounded-2xl p-4 border border-slate-100">
         <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 gap-2">
               <View className="h-4 w-32 bg-slate-200 rounded-full" />
               <View className="h-6 w-20 bg-slate-100 rounded-full mt-1" />
            </View>
            <View className="h-5 w-14 bg-slate-100 rounded-full" />
         </View>
         <View className="gap-2">
            <View className="h-4 w-48 bg-slate-100 rounded-full" />
            <View className="h-4 w-40 bg-slate-100 rounded-full" />
         </View>
      </View>
   );
}

export function HomeScreen() {
   const navigation = useAppNavigation();
   const tags = useLiveDevices();

   const [isLoading, setIsLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);

   useEffect(() => {
      setIsLoading(true);
      getDevices()
         .catch((err) => {
            console.error("[HomeScreen] Erro ao sincronizar dispositivos da API:", err);
         })
         .finally(() => {
            setIsLoading(false);
         });
   }, []);

   const onRefresh = async () => {
      setRefreshing(true);
      try {
         await getDevices();
      } catch (err) {
         console.error("[HomeScreen] Erro ao sincronizar tags:", err);
      } finally {
         setRefreshing(false);
      }
   };

   const handleTagClick = (tag: (typeof tags)[0]) => {
      navigation.navigate("TagDetails", { tag });
   };

   return (
      <View className="flex-1 bg-slate-50">
         {/* Header */}
         <View className="bg-white border-b border-slate-200 px-5 pb-4 mt-12">
            <View className="flex-row items-center justify-between max-w-md mx-auto w-full">
               <Text className="text-xl font-semibold text-slate-900">
                  UFTag APP
               </Text>

               <View className="flex-row items-center gap-3">
                  {refreshing && (
                     <ActivityIndicator size="small" color="#2563eb" />
                  )}
                  <TouchableOpacity className="p-1" onPress={() => navigation.navigate("Settings")}>
                     <View className="w-9 h-9 bg-blue-600 rounded-full items-center justify-center">
                        <User size={18} color="#FFFFFF" />
                     </View>
                  </TouchableOpacity>
               </View>
            </View>
         </View>

         {/* Content */}
         <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-5 pb-28 max-w-md mx-auto w-full"
            refreshControl={
               <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#2563eb"]}
                  tintColor="#2563eb"
               />
            }
         >
            <View className="flex-row items-center justify-between mb-3">
               <Text className="text-base font-medium text-slate-700">
                  Minhas Tags
               </Text>
               {!isLoading && (
                  <TouchableOpacity
                     onPress={onRefresh}
                     className="flex-row items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full"
                  >
                     <RefreshCw size={13} color="#2563eb" />
                     <Text className="text-xs font-medium text-blue-600">Atualizar</Text>
                  </TouchableOpacity>
               )}
            </View>

            <View className="gap-3">
               {isLoading ? (
                  <>
                     <TagCardSkeleton />
                     <TagCardSkeleton />
                     <TagCardSkeleton />
                  </>
               ) : tags.length === 0 ? (
                  <View className="items-center bg-white rounded-3xl border border-slate-200 px-6 py-8 shadow">
                     <Text className="text-base text-slate-700 font-semibold mb-2">
                        Nenhuma tag registrada ainda
                     </Text>
                     <Text className="text-sm text-slate-500 text-center">
                        Assim que você cadastrar uma tag, ela aparecerá aqui.
                     </Text>
                  </View>
               ) : (
                  tags.map((tag) => (
                     <TagCard
                        key={tag.id}
                        name={tag.name}
                        battery={tag.battery}
                        location={tag.locationText}
                        lastUpdate={tag.lastUpdate}
                        isNear={tag.isNear}
                        onClick={() => handleTagClick(tag)}
                     />
                  ))
               )}
            </View>
         </ScrollView>

         {/* Bottom Nav */}
         <BottomNav />
      </View>
   );
}
