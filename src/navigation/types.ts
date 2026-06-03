import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { DeviceResponse } from "../api/devices";

export type RootStackParamList = {
   Home: undefined;
   Map: undefined;
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
      tag: DeviceResponse;
   };

   ConfigureTag: {
      deviceId: string;
   }
};

export function useAppNavigation() {
   type NavigationProp =
      NativeStackNavigationProp<RootStackParamList>;
   return useNavigation<NavigationProp>();
}