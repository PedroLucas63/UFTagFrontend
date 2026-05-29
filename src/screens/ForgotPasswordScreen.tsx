import { useMemo, useState } from "react";

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
import { AlertModal } from "../components/AlertModal";
import { forgotPassword } from "../api/auth";

export function ForgotPasswordScreen() {
   const navigation = useNavigation();

   const [email, setEmail] = useState("");

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

   async function handleSubmit() {
      if (
         !emailIsValid ||
         loading
      ) {
         return;
      }

      try {
         setLoading(true);

         const result = await forgotPassword(email);

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
            message: "Instruções para recuperar sua senha enviadas, cheque o seu e-mail!",
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
                  : "Falha ao solicitar recuperação de senha",
         });
      } finally {
         setLoading(false);
      }
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

                  <TouchableOpacity
                     onPress={handleSubmit}
                     disabled={!emailIsValid || loading}
                     className={`rounded-2xl py-4 items-center mt-2 ${emailIsValid &&
                        !loading
                        ? "bg-blue-600"
                        : "bg-gray-400"
                        }`}
                  >
                     <Text className="text-white font-semibold text-base">
                        {loading
                           ? "Solicitando alteração..."
                           : "Solicitar Alteração"}
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