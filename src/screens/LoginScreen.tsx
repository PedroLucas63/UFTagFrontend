import { useMemo, useState } from "react";

import {
   View,
   Text,
   TextInput,
   TouchableOpacity,
} from "react-native";

import {
   Mail,
   Lock,
   Eye,
   EyeOff,
} from "lucide-react-native";

import { login, logout } from "../api/auth";
import { AlertModal } from "../components/AlertModal";
import { Loading } from "../components/Loading";
import { useAppNavigation } from "../navigation/types";

export function LoginScreen() {
   const navigation = useAppNavigation();

   const [email, setEmail] =
      useState("");

   const [password, setPassword] =
      useState("");

   const [showPassword, setShowPassword] =
      useState(false);

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

   const formIsValid =
      emailIsValid &&
      password.trim().length > 0;

   async function handleLogin() {
      if (
         !formIsValid ||
         loading
      ) {
         return;
      }

      try {
         setLoading(true);

         const result = await login(
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
            message: "Login realizado com sucesso",
         });

         return;
      } catch (error) {
         setAlertState({
            visible: true,
            title: "Erro",
            message:
               error instanceof Error
                  ? error.message
                  : "Falha ao entrar",
         });
      } finally {
         setLoading(false);
      }
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
                  <View>
                     <View
                        className={`flex-row items-center border rounded-2xl px-4 py-3 mb-1 ${email.length > 0
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
                           className="flex-1 ml-3 text-gray-900"
                        />
                     </View>

                     {email.length > 0 &&
                        !emailIsValid && (
                           <Text className="text-red-500 text-xs ml-1 mb-3">
                              Email inválido
                           </Text>
                        )}
                  </View>

                  <View>
                     <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-3 mb-1">
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
                           secureTextEntry={!showPassword}
                           placeholderTextColor="#6B7280"
                           className="flex-1 ml-3 text-gray-900"
                        />

                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                           {showPassword ? (
                              <EyeOff size={20} color="#6B7280" />
                           ) : (
                              <Eye size={20} color="#6B7280" />
                           )}
                        </TouchableOpacity>
                     </View>

                     {password.length ===
                        0 && (
                           <Text className="text-red-500 text-xs ml-1 mb-3">
                              Informe sua senha
                           </Text>
                        )}
                  </View>

                  <TouchableOpacity
                     onPress={
                        handleLogin
                     }
                     disabled={
                        !formIsValid ||
                        loading
                     }
                     className={`rounded-2xl py-4 items-center mt-4 ${formIsValid &&
                        !loading
                        ? "bg-blue-600"
                        : "bg-gray-400"
                        }`}
                  >
                     {loading ? (
                        <Loading
                           variant="inline"
                           size="sm"
                           color="#FFFFFF"
                           message="Entrando..."
                           textClassName="text-white font-semibold text-base"
                        />
                     ) : (
                        <Text className="text-white font-semibold text-base">
                           Entrar
                        </Text>
                     )}
                  </TouchableOpacity>
               </View>

               <View className="flex-row justify-center mt-6">

                  <Text className="text-gray-600">
                     Não possui conta?
                  </Text>

                  <TouchableOpacity
                     className="ml-1"
                     onPress={() =>
                        navigation.navigate(
                           "Signup" as never
                        )
                     }
                  >
                     <Text className="text-blue-600 font-medium">
                        Cadastre-se
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
      </View>
   );
}