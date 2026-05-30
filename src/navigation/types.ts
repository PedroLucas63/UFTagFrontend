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

   TagDetails: {
      tag: DeviceResponse;
   };
};

export function useAppNavigation() {
   type NavigationProp =
      NativeStackNavigationProp<RootStackParamList>;
   return useNavigation<NavigationProp>();
}