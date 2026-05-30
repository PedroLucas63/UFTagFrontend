import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import {
   Home,
   Map,
   Plus,
   Scan,
   Settings,
} from "lucide-react-native";

import { useAppNavigation, RootStackParamList } from "../navigation/types";

type BottomNavScreen =
   | "Home"
   | "Map"
   | "Add"
   | "Scanner"
   | "Settings";

type NavItem = {
   label: string;
   screen: BottomNavScreen;
   icon: React.ComponentType<{ size?: number; color?: string }>;
   highlight?: boolean;
};

export function BottomNav() {
   const route = useRoute<RouteProp<RootStackParamList, keyof RootStackParamList>>();
   const navigation = useAppNavigation();

   const currentRoute = route.name;

   const navItems: NavItem[] = [
      { icon: Home, label: "Home", screen: "Home" },
      { icon: Map, label: "Mapa", screen: "Map" },
      { icon: Plus, label: "Adicionar", screen: "Add", highlight: true },
      { icon: Scan, label: "Scanner", screen: "Scanner" },
      { icon: Settings, label: "Config", screen: "Settings" },
   ];

   return (
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-2">
         <View className="flex-row items-end justify-around px-4 py-3 max-w-md mx-auto w-full">
            {navItems.map((item) => {
               const Icon = item.icon;
               const isActive = currentRoute === item.screen;

               // 🔵 BOTÃO CENTRAL (highlight)
               if (item.highlight) {
                  return (
                     <TouchableOpacity
                        key={item.screen}
                        onPress={() => navigation.navigate(item.screen)}
                        className="items-center -mt-8"
                        activeOpacity={0.8}
                     >
                        <View className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg">
                           <Icon size={26} color="#FFFFFF" />
                        </View>

                        <Text className="text-xs mt-2 text-slate-500">
                           {item.label}
                        </Text>
                     </TouchableOpacity>
                  );
               }

               // 🔘 ITENS NORMAIS
               return (
                  <TouchableOpacity
                     key={item.screen}
                     onPress={() => navigation.navigate(item.screen)}
                     className="items-center gap-1 min-w-[60px]"
                     activeOpacity={0.8}
                  >
                     <Icon
                        size={24}
                        color={isActive ? "#2563EB" : "#94A3B8"}
                     />

                     <Text
                        className={`text-xs ${isActive ? "text-blue-600" : "text-slate-400"
                           }`}
                     >
                        {item.label}
                     </Text>
                  </TouchableOpacity>
               );
            })}
         </View>
      </View>
   );
}