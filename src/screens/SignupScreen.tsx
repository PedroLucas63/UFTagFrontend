import { useState } from "react";

import {
   View,
   Text,
   TextInput,
   TouchableOpacity,
   Alert,
   ScrollView,
} from "react-native";

import {
   User,
   Mail,
   Lock,
   ArrowLeft,
} from "lucide-react-native";

import { useNavigation } from "@react-navigation/native";

export function SignupScreen() {
   const navigation = useNavigation();

   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");

   function handleSignup() {
      if (password !== confirmPassword) {
         Alert.alert(
            "Erro",
            "As senhas não coincidem"
         );

         return;
      }

      // TODO: Aqui você pode adicionar a lógica de cadastro, como chamadas à API
      Alert.alert(
         "Sucesso",
         "Conta criada com sucesso"
      );

      navigation.navigate("Home" as never);
   }

   return (
      <ScrollView
         className="flex-1 bg-slate-50"
         contentContainerStyle={{
            padding: 24,
         }}
      >
         <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center mb-6 mt-12"
         >
            <ArrowLeft
               size={20}
               color="#4B5563"
            />

            <Text className="ml-2 text-gray-600">
               Voltar
            </Text>
         </TouchableOpacity>

         <View className="w-full max-w-md self-center">

            <View className="items-center mb-8">

               <Text className="text-3xl font-bold mb-2">
                  Criar Conta
               </Text>

               <Text className="text-gray-600">
                  Cadastre-se no UFTag APP
               </Text>

            </View>

            <View className="bg-white rounded-3xl p-8 shadow">

               <View className="gap-4">

                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3">

                     <User
                        size={20}
                        color="#6B7280"
                     />

                     <TextInput
                        placeholder="Nome Completo"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor="#6B7280"
                        className="flex-1 ml-3"
                     />

                  </View>

                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3">

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

                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3">

                     <Lock
                        size={20}
                        color="#6B7280"
                     />

                     <TextInput
                        placeholder="Senha"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor="#6B7280"
                        className="flex-1 ml-3"
                     />

                  </View>

                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3">

                     <Lock
                        size={20}
                        color="#6B7280"
                     />

                     <TextInput
                        placeholder="Repetir Senha"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholderTextColor="#6B7280"
                        className="flex-1 ml-3"
                     />

                  </View>

                  <TouchableOpacity
                     onPress={handleSignup}
                     className="bg-blue-600 rounded-2xl py-4 items-center mt-2"
                  >
                     <Text className="text-white font-semibold text-base">
                        Cadastrar
                     </Text>
                  </TouchableOpacity>

               </View>

               <View className="flex-row justify-center mt-6">

                  <Text className="text-gray-600">
                     Já possui conta?
                  </Text>

                  <TouchableOpacity
                     onPress={() => navigation.goBack()}
                  >
                     <Text className="text-blue-600 font-semibold ml-1">
                        Entrar
                     </Text>
                  </TouchableOpacity>

               </View>

            </View>
         </View>
      </ScrollView>
   );
}