import { useState } from "react";
import {
   View,
   Text,
   TextInput,
   TouchableOpacity,
} from "react-native";

import {
   Mail,
   Lock,
} from "lucide-react-native";

import { useNavigation } from "@react-navigation/native";

export function LoginScreen() {
   const navigation = useNavigation();

   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");

   function handleLogin() {
      // TODO: Aqui você pode adicionar a lógica de autenticação, como chamadas à API
      navigation.navigate("Home" as never);
   }

   return (
      <View className="flex-1 bg-slate-50 justify-center p-6">
         <View className="w-full max-w-md self-center">

            <View className="items-center mb-8">
               <View className="w-20 h-20 bg-blue-600 rounded-3xl items-center justify-center mb-4">
                  <Text className="text-3xl font-bold text-white">
                     UF
                  </Text>
               </View>

               <Text className="text-2xl font-bold mb-2">
                  Bem-vindo
               </Text>

               <Text className="text-gray-600">
                  Entre na sua conta UFTag
               </Text>
            </View>

            <View className="bg-white rounded-3xl shadow p-8">

               <View className="space-y-4">

                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3 mb-4">
                     <Mail size={20} color="#6B7280" />

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

                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3 mb-4">
                     <Lock size={20} color="#6B7280" />

                     <TextInput
                        placeholder="Senha"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor="#6B7280"
                        className="flex-1 ml-3"
                     />
                  </View>

                  <TouchableOpacity
                     onPress={() =>
                        navigation.navigate("ForgotPassword" as never)
                     }>
                     <Text className="text-blue-600 text-sm">
                        Perdi minha senha
                     </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                     onPress={handleLogin}
                     className="bg-blue-600 rounded-2xl py-4 items-center mt-4"
                  >
                     <Text className="text-white font-semibold text-base">
                        Entrar
                     </Text>
                  </TouchableOpacity>

               </View>

               <View className="flex-row justify-center mt-6">
                  <Text className="text-gray-600">
                     Não possui conta?
                  </Text>

                  <TouchableOpacity
                     className="ml-1"
                     onPress={() =>
                        navigation.navigate("Signup" as never)
                     }>
                     <Text className="text-blue-600 font-medium">
                        Cadastre-se
                     </Text>
                  </TouchableOpacity>
               </View>

            </View>
         </View>
      </View>
   );
}