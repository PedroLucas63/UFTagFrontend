import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LocalDevice } from "../storage/devicesStorage";

export type RootStackParamList = {
   Home: undefined;
   Add: undefined;
   Scanner: undefined;
   Settings: undefined;
   ForgotPassword: undefined;
   Login: undefined;
   Signup: undefined;

   TagInfo: {
      deviceId: string;
   };

   TagDetails: {
      tag: LocalDevice;
   };

   ConfigureTag: {
      deviceId: string;
      bleMacAddress: string;
   }

   Map: {
      deviceId?: string;
   } | undefined;
};

export function useAppNavigation() {
   type NavigationProp =
      NativeStackNavigationProp<RootStackParamList>;
   return useNavigation<NavigationProp>();
}