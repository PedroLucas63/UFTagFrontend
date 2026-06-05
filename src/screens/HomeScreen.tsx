import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Bell, User } from "lucide-react-native";

import { TagCard } from "../components/TagCard";
import { BottomNav } from "../components/BottomNav";
import { Loading } from "../components/Loading";
import { useAppNavigation } from "../navigation/types";
import { DeviceResponse, getDevices } from "../api/devices";
import { saveDevices } from "../storage/devicesStorage";

export function HomeScreen() {
   const navigation = useAppNavigation();

   const [tags, setTags] = useState<DeviceResponse[]>([]);
   const [loading, setLoading] = useState(true);
   const [tagsError, setTagsError] = useState<string | null>(null);

   useEffect(() => {
      let isMounted = true;

      async function loadDevices() {
         try {
            const result = await getDevices();

            if (!isMounted) {
               return;
            }

            if (result.ok) {
               setTags(result.data);
               await saveDevices(result.ok ? result.data : []);

               setTagsError(null);
               return;
            }

            setTags([]);
            setTagsError(result.error);
         } catch (error) {
            if (!isMounted) {
               return;
            }

            setTags([]);
            setTagsError(
               error instanceof Error
                  ? error.message
                  : "Falha ao carregar tags"
            );
         } finally {
            if (isMounted) {
               setLoading(false);
            }
         }
      }

      loadDevices();

      return () => {
         isMounted = false;
      };
   }, []);

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
                  <TouchableOpacity className="p-2 rounded-full">
                     <Bell size={22} color="#334155" />
                  </TouchableOpacity>

                  <TouchableOpacity className="p-1">
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
         >
            <Text className="text-base font-medium text-slate-700 mb-3">
               Minhas Tags
            </Text>

            <View className="gap-3">
               {loading ? (
                  <Loading
                     variant="full"
                     message="Buscando suas tags..."
                     containerClassName="py-10"
                  />
               ) : tagsError ? (
                  <Text className="text-sm text-red-600">
                     {tagsError}
                  </Text>
               ) : tags.length === 0 ? (
                  <View className="items-center bg-white rounded-3xl border border-slate-200 px-6 py-8 shadow">
                     <Text className="text-base text-slate-700 font-semibold mb-2">
                        Nenhuma tag registrada ainda
                     </Text>
                     <Text className="text-sm text-slate-500 text-center">
                        Assim que voce cadastrar uma tag, ela aparecera aqui.
                     </Text>
                  </View>
               ) : (
                  tags.map((tag) => (
                     <TagCard
                        key={tag.id}
                        name={tag.name}
                        battery={100} // TODO: replace with real battery level
                        location={"Campus UFSC"} // TODO: replace with real location
                        lastUpdate={"10 minutos atrás"} // TODO: replace with real last update time
                        isNear={true} // TODO: replace with real proximity status
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