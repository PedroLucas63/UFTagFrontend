import React, { useEffect, useState } from "react";
import {
   View,
   Text,
   TextInput,
   TouchableOpacity,
   ScrollView,
   Switch,
} from "react-native";
import {
   User,
   Phone,
   LogOut,
   CheckCircle,
} from "lucide-react-native";

import { getMe, updateName, updatePhoneNumber, UserResponse } from "../api/users";
import { logout } from "../api/auth";
import { AlertModal } from "../components/AlertModal";
import { Loading } from "../components/Loading";
import { BottomNav } from "../components/BottomNav";

export function SettingsScreen() {
   const [user, setUser] = useState<UserResponse | null>(null);
   const [name, setName] = useState("");
   const [phone, setPhone] = useState("");
   const [isDarkMode, setIsDarkMode] = useState(false);
   const [showSuccessToast, setShowSuccessToast] = useState(false);

   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [alertState, setAlertState] = useState({
      visible: false,
      title: "",
      message: "",
   });

   useEffect(() => {
      let isMounted = true;

      async function loadProfile() {
         try {
            const result = await getMe();
            if (!isMounted) return;

            if (result.ok) {
               setUser(result.data);
               setName(result.data.Name ?? result.data.Name ?? "");
               setPhone(result.data.PhoneNumber ?? result.data.PhoneNumber ?? "");
            } else {
               setAlertState({
                  visible: true,
                  title: "Erro",
                  message: result.error ?? "Falha ao carregar perfil.",
               });
            }
         } catch (error) {
            if (!isMounted) return;
            setAlertState({
               visible: true,
               title: "Erro",
               message: "Ocorreu um erro ao carregar as informações do usuário.",
            });
         } finally {
            if (isMounted) {
               setLoading(false);
            }
         }
      }

      loadProfile();

      return () => {
         isMounted = false;
      };
   }, []);

   async function handleSaveChanges() {
      if (!user) return;
      const userId = user.Id ?? user.Id;
      if (!userId) return;

      try {
         setSaving(true);

         // 1. Update Name if changed
         const originalName = user.Name ?? user.Name ?? "";
         if (name.trim() !== originalName.trim()) {
            const nameResult = await updateName(userId, name);
            if (!nameResult.ok) {
               setAlertState({
                  visible: true,
                  title: "Erro",
                  message: nameResult.error ?? "Falha ao atualizar nome.",
               });
               return;
            }
         }

         // 2. Update Phone if changed
         const originalPhone = user.PhoneNumber ?? user.PhoneNumber ?? "";
         if (phone.trim() !== originalPhone.trim()) {
            const phoneResult = await updatePhoneNumber(userId, phone);
            if (!phoneResult.ok) {
               setAlertState({
                  visible: true,
                  title: "Erro",
                  message: phoneResult.error ?? "Falha ao atualizar telefone.",
               });
               return;
            }
         }

         setShowSuccessToast(true);
         setTimeout(() => {
            setShowSuccessToast(false);
         }, 3000);

         // Update local states
         setUser((prev) =>
            prev
               ? {
                    ...prev,
                    Name: name,
                    PhoneNumber: phone,
                 }
               : null
         );
      } catch (error) {
         setAlertState({
            visible: true,
            title: "Erro",
            message: "Erro inesperado ao salvar alterações.",
         });
      } finally {
         setSaving(false);
      }
   }

   async function handleLogout() {
      try {
         await logout();
      } catch (error) {
         setAlertState({
            visible: true,
            title: "Erro",
            message: "Falha ao sair do sistema.",
         });
      }
   }

   if (loading) {
      return (
         <View className="flex-1 bg-slate-50 justify-center">
            <Loading message="Carregando perfil..." />
         </View>
      );
   }

   return (
      <View className="flex-1 bg-slate-50">
         {/* Toast Notification */}
         {showSuccessToast && (
            <View className="absolute top-28 left-6 right-6 z-50 bg-[#E6FBF2] border border-[#C6F6D5] rounded-2xl p-4 flex-row items-center shadow-md">
               <CheckCircle size={20} color="#10B981" />
               <Text className="text-emerald-800 font-semibold ml-3 flex-1">
                  Alterações salvas com sucesso!
               </Text>
            </View>
         )}

         {/* Header */}
         <View className="bg-white border-b border-slate-200 px-5 pb-4 mt-12">
            <View className="flex-row items-center justify-center max-w-md mx-auto w-full">
               <Text className="text-xl font-bold text-slate-900">
                  Configurações
               </Text>
            </View>
         </View>

         {/* Content */}
         <ScrollView
            className="flex-1"
            contentContainerStyle={{
               paddingHorizontal: 24,
               paddingTop: 16,
               paddingBottom: 120,
            }}
         >
            <View className="w-full max-w-md self-center">
               {/* Profile Info */}
               <View className="items-center mb-6">
                  <View className="w-24 h-24 bg-blue-600 rounded-full items-center justify-center shadow-md mb-3">
                     <User size={48} color="#FFFFFF" />
                  </View>
                  <Text className="text-xl font-bold text-slate-800">
                     {name || "Usuário"}
                  </Text>
               </View>

               {/* Inputs Box */}
               <View className="bg-white rounded-3xl p-6 shadow-sm gap-4 mb-4">
                  <View>
                     <Text className="text-sm font-semibold text-slate-500 mb-2">
                        Nome
                     </Text>
                     <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50">
                        <User size={18} color="#94A3B8" />
                        <TextInput
                           placeholder="Seu nome"
                           value={name}
                           onChangeText={setName}
                           placeholderTextColor="#94A3B8"
                           className="flex-1 ml-3 text-slate-800 text-sm py-0"
                        />
                     </View>
                  </View>

                  <View>
                     <Text className="text-sm font-semibold text-slate-500 mb-2">
                        Telefone
                     </Text>
                     <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50">
                        <Phone size={18} color="#94A3B8" />
                        <TextInput
                           placeholder="(84) 99999-9999"
                           value={phone}
                           onChangeText={setPhone}
                           placeholderTextColor="#94A3B8"
                           className="flex-1 ml-3 text-slate-800 text-sm py-0"
                           keyboardType="phone-pad"
                        />
                     </View>
                  </View>

                  <TouchableOpacity
                     onPress={handleSaveChanges}
                     disabled={saving}
                     className="bg-blue-600 rounded-2xl py-4 items-center mt-2 shadow-sm"
                  >
                     {saving ? (
                        <Loading
                           variant="inline"
                           size="sm"
                           color="#FFFFFF"
                           message="Salvando..."
                           textClassName="text-white font-semibold text-base"
                        />
                     ) : (
                        <Text className="text-white font-semibold text-base">
                           Salvar Alterações
                        </Text>
                     )}
                  </TouchableOpacity>
               </View>

               {/* Theme Option */}
               <View className="bg-white rounded-3xl px-6 py-4 shadow-sm flex-row items-center justify-between mb-6">
                  <Text className="text-base font-semibold text-slate-800">
                     Tema Escuro
                  </Text>
                  <Switch
                     value={isDarkMode}
                     onValueChange={setIsDarkMode}
                     trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                     thumbColor={isDarkMode ? "#2563EB" : "#F8FAFC"}
                  />
               </View>

               {/* Log Out Button */}
               <TouchableOpacity
                  onPress={handleLogout}
                  className="bg-red-500 rounded-2xl py-4 flex-row items-center justify-center mb-6 shadow-sm"
               >
                  <LogOut size={20} color="#FFFFFF" />
                  <Text className="text-white font-semibold text-base ml-2">
                     Sair
                  </Text>
               </TouchableOpacity>

               {/* Version Info */}
               <Text className="text-xs text-slate-400 text-center">
                  Versão 1.0.0
               </Text>
            </View>
         </ScrollView>

         {/* Bottom Nav */}
         <BottomNav />

         <AlertModal
            visible={alertState.visible}
            title={alertState.title}
            message={alertState.message}
            onClose={() =>
               setAlertState((prev) => ({
                  ...prev,
                  visible: false,
               }))
            }
         />
      </View>
   );
}
