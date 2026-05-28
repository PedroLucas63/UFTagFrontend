import { NavigationContainer } from "@react-navigation/native";

import {
   createNativeStackNavigator,
} from "@react-navigation/native-stack";

import { LoginScreen } from "../screens/LoginScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { SignupScreen } from "../screens/SignupScreen";

const Stack = createNativeStackNavigator();

export function AppNavigator() {
   return (
      <NavigationContainer>
         <Stack.Navigator
            screenOptions={{
               headerShown: false,
            }}
         >
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
         </Stack.Navigator>
      </NavigationContainer>
   );
}