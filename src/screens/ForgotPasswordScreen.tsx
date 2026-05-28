import { useState } from "react";

import {
   View,
   Text,
   TextInput,
   TouchableOpacity,
   Alert,
} from "react-native";

import {
   Mail,
   ArrowLeft,
} from "lucide-react-native";

import { useNavigation } from "@react-navigation/native";

export function ForgotPasswordScreen() {
   const navigation = useNavigation();

   const [email, setEmail] = useState("");

   function handleSubmit() {
      // TODO: Aqui você pode adicionar a lógica para solicitar a recuperação de senha, como chamadas à API
      Alert.alert(
         "Sucesso",
         "Email de recuperação enviado"
      );

      setTimeout(() => {
         navigation.goBack();
      }, 1500);
   }

   return (
      <View className="flex-1 bg-slate-50 p-6">

         <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center mb-6 mt-12"
         >
            <ArrowLeft size={20} color="#4B5563" />

            <Text className="ml-2 text-gray-600">
               Voltar
            </Text>
         </TouchableOpacity>

         <View className="w-full max-w-md self-center pt-12">

            <View className="items-center mb-8">

               <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
                  <Mail
                     size={40}
                     color="#2563EB"
                  />
               </View>

               <Text className="text-2xl font-bold mb-2 text-center">
                  Esqueci Minha Senha
               </Text>

               <Text className="text-gray-600 text-center">
                  Informe seu email e enviaremos instruções para recuperar sua senha
               </Text>

            </View>

            <View className="bg-white rounded-3xl p-8 shadow">

               <View>

                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3 mb-4">

                     <Mail
                        size={20}
                        color="#6B7280"
                     />

                     <TextInput
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#6B7280"
                        className="flex-1 ml-3"
                     />

                  </View>

                  <TouchableOpacity
                     onPress={handleSubmit}
                     className="bg-blue-600 rounded-2xl py-4 items-center"
                  >
                     <Text className="text-white font-semibold text-base">
                        Solicitar Alteração
                     </Text>
                  </TouchableOpacity>

               </View>

            </View>
         </View>
      </View>
   );
}