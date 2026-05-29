import { useMemo, useState } from "react";

import {
   View,
   Text,
   TextInput,
   TouchableOpacity,
   ScrollView,
} from "react-native";

import {
   User,
   Mail,
   Lock,
   ArrowLeft,
} from "lucide-react-native";

import { useNavigation } from "@react-navigation/native";

import { register } from "../api/auth";
import { AlertModal } from "../components/AlertModal";

export function SignupScreen() {
   const navigation = useNavigation();

   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] =
      useState("");

   const [
      confirmPassword,
      setConfirmPassword,
   ] = useState("");

   const [loading, setLoading] =
      useState(false);

   const [alertState, setAlertState] =
      useState({
         visible: false,
         title: "",
         message: "",
      });

   const emailIsValid = useMemo(() => {
      return /\S+@\S+\.\S+/.test(email);
   }, [email]);

   const passwordHasMinLength =
      password.length >= 8;

   const passwordHasUppercase =
      /[A-Z]/.test(password);

   const passwordHasLowercase =
      /[a-z]/.test(password);

   const passwordHasNumber =
      /[0-9]/.test(password);

   const passwordHasSpecialCharacter =
      /[^A-Za-z0-9]/.test(password);

   const passwordIsValid =
      passwordHasMinLength &&
      passwordHasUppercase &&
      passwordHasLowercase &&
      passwordHasNumber &&
      passwordHasSpecialCharacter;

   const passwordsMatch =
      password === confirmPassword;

   const formIsValid =
      emailIsValid &&
      passwordIsValid &&
      passwordsMatch;

   async function handleSignup() {
      if (
         !formIsValid ||
         loading
      ) {
         return;
      }

      try {
         setLoading(true);

         const result = await register(
            email,
            password
         );

         if (!result.ok) {
            setAlertState({
               visible: true,
               title: "Erro",
               message: result.error,
            });
            return;
         }

         setAlertState({
            visible: true,
            title: "Sucesso",
            message: "Conta criada com sucesso, confirme seu e-mail para entrar!",
         });

         await new Promise(() =>
            setTimeout(() => {
               navigation.goBack();
            }, 3000)
         );
      } catch (error) {
         setAlertState({
            visible: true,
            title: "Erro",
            message:
               error instanceof Error
                  ? error.message
                  : "Falha ao criar conta",
         });
      } finally {
         setLoading(false);
      }
   }

   return (
      <ScrollView
         className="flex-1 bg-slate-50"
         contentContainerStyle={{
            padding: 24,
         }}
      >
         <TouchableOpacity
            onPress={() =>
               navigation.goBack()
            }
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

                  <View>
                     <View
                        className={`flex-row items-center border rounded-2xl px-4 py-3 ${email.length > 0
                           ? emailIsValid
                              ? "border-green-500"
                              : "border-red-500"
                           : "border-gray-300"
                           }`}
                     >
                        <Mail
                           size={20}
                           color="#6B7280"
                        />

                        <TextInput
                           placeholder="Email"
                           value={email}
                           onChangeText={
                              setEmail
                           }
                           keyboardType="email-address"
                           autoCapitalize="none"
                           placeholderTextColor="#6B7280"
                           className="flex-1 ml-3"
                        />
                     </View>

                     {email.length > 0 &&
                        !emailIsValid && (
                           <Text className="text-red-500 text-xs mt-1 ml-1">
                              Email inválido
                           </Text>
                        )}
                  </View>

                  <View>
                     <View
                        className={`flex-row items-center border rounded-2xl px-4 py-3 ${password.length > 0
                           ? passwordIsValid
                              ? "border-green-500"
                              : "border-red-500"
                           : "border-gray-300"
                           }`}
                     >

                        <Lock
                           size={20}
                           color="#6B7280"
                        />

                        <TextInput
                           placeholder="Senha"
                           value={password}
                           onChangeText={
                              setPassword
                           }
                           secureTextEntry
                           placeholderTextColor="#6B7280"
                           className="flex-1 ml-3 text-gray-900"
                        />
                     </View>

                     {password.length > 0 && (
                        <View className="mt-2 ml-1 gap-1">
                           {!passwordHasMinLength && (
                              <Text className="text-xs text-red-500">
                                 • Mínimo de 8 caracteres
                              </Text>
                           )}

                           {!passwordHasUppercase && (
                              <Text className="text-xs text-red-500">
                                 • Uma letra maiuscula
                              </Text>
                           )}

                           {!passwordHasLowercase && (
                              <Text
                                 className={"text-xs text-red-500"}>
                                 • Uma letra minúscula
                              </Text>
                           )}

                           {!passwordHasNumber && (
                              <Text
                                 className={"text-xs text-red-500"}>
                                 • Um número
                              </Text>
                           )}

                           {!passwordHasSpecialCharacter && (
                              <Text
                                 className={"text-xs text-red-500"}>
                                 • Um caractere especial
                              </Text>
                           )}
                        </View>
                     )}
                  </View>

                  <View>
                     <View
                        className={`flex-row items-center border rounded-2xl px-4 py-3 ${confirmPassword.length >
                           0
                           ? passwordsMatch
                              ? "border-green-500"
                              : "border-red-500"
                           : "border-gray-300"
                           }`}
                     >
                        <Lock
                           size={20}
                           color="#6B7280"
                        />

                        <TextInput
                           placeholder="Repetir Senha"
                           value={
                              confirmPassword
                           }
                           onChangeText={
                              setConfirmPassword
                           }
                           secureTextEntry
                           placeholderTextColor="#6B7280"
                           className="flex-1 ml-3 text-gray-900"
                        />
                     </View>

                     {confirmPassword.length >
                        0 &&
                        !passwordsMatch && (
                           <Text className="text-red-500 text-xs mt-1 ml-1">
                              As senhas não coincidem
                           </Text>
                        )}
                  </View>

                  <TouchableOpacity
                     onPress={
                        handleSignup
                     }
                     disabled={
                        !formIsValid ||
                        loading
                     }
                     className={`rounded-2xl py-4 items-center mt-2 ${formIsValid &&
                        !loading
                        ? "bg-blue-600"
                        : "bg-gray-400"
                        }`}
                  >
                     <Text className="text-white font-semibold text-base">
                        {loading
                           ? "Cadastrando..."
                           : "Cadastrar"}
                     </Text>
                  </TouchableOpacity>
               </View>

               <View className="flex-row justify-center mt-6">
                  <Text className="text-gray-600">
                     Já possui conta?
                  </Text>

                  <TouchableOpacity
                     onPress={() =>
                        navigation.goBack()
                     }
                  >
                     <Text className="text-blue-600 font-semibold ml-1">
                        Entrar
                     </Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
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
      </ScrollView>
   );
}