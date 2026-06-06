import { NavigationContainer } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { View } from "react-native";

import {
   createNativeStackNavigator,
} from "@react-navigation/native-stack";

import { LoginScreen } from "../screens/LoginScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { SignupScreen } from "../screens/SignupScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { getAccessToken, getRefreshToken } from "../storage/tokenStorage";
import { setAuthState, subscribeAuthState } from "../auth/authState";
import { RootStackParamList } from "./types";
import { Loading } from "../components/Loading";
import { TagInfoScreen } from "../screens/TagInfoScreen";
import { AddTagScreen } from "../screens/AddTagScreen";
import { ConfigureTagScreen } from "../screens/ConfigureTagScreen";
import { MapScreen } from '../screens/MapScreen';
import { TagDetailsScreen } from "../screens/TagDetailsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
   const [isAuthenticated, setIsAuthenticated] =
      useState<boolean | null>(null);

   useEffect(() => {
      let isMounted = true;

      const unsubscribe = subscribeAuthState(
         (nextState) => {
            if (isMounted) {
               setIsAuthenticated(nextState);
            }
         }
      );

      async function bootstrapAuth() {
         const accessToken = await getAccessToken();
         const refreshToken = await getRefreshToken();
         const hasTokens = Boolean(
            accessToken && refreshToken
         );
         setAuthState(hasTokens);
      }

      bootstrapAuth();

      return () => {
         isMounted = false;
         unsubscribe();
      };
   }, []);

   if (isAuthenticated === null) {
      return (
         <View className="flex-1">
            <Loading
               message="Preparando sua sessao..."
               containerClassName="flex-1"
            />
         </View>
      );
   }

   return (
      <NavigationContainer>
         <Stack.Navigator
            screenOptions={{
               headerShown: false,
            }}
         >
            {isAuthenticated ? (
               <>
                  <Stack.Screen
                     name="Home"
                     component={HomeScreen}
                     options={{ animation: "none" }}
                  />
                  <Stack.Screen
                     name="Settings"
                     component={SettingsScreen}
                     options={{ animation: "none" }}
                  />
                  <Stack.Screen
                     name="Scanner"
                     component={ScannerScreen}
                     options={{ animation: "none" }}
                  />
                  <Stack.Screen
                     name="TagInfo"
                     component={TagInfoScreen}
                     options={{ animation: "none" }}
                  />
                  <Stack.Screen
                     name="TagDetails"
                     component={TagDetailsScreen}
                     options={{ animation: "none" }}
                  />
                  <Stack.Screen
                     name="Add"
                     component={AddTagScreen}
                     options={{ animation: "none" }}
                  />

                  <Stack.Screen
                     name="ConfigureTag"
                     component={ConfigureTagScreen}
                     options={{ animation: "none" }}
                  />
                  <Stack.Screen
                     name="Map"
                     component={MapScreen}
                     options={{ animation: "none" }}
                  />
               </>
            ) : (
               <>
                  <Stack.Screen
                     name="Login"
                     component={LoginScreen}
                  />
                  <Stack.Screen
                     name="ForgotPassword"
                     component={ForgotPasswordScreen}
                  />
                  <Stack.Screen
                     name="Signup"
                     component={SignupScreen}
                  />
               </>
            )}
         </Stack.Navigator>
      </NavigationContainer>
   );
}