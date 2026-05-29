import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REFRESH_TOKEN_SERVICE = 'refresh-token';
const ACCESS_TOKEN_KEY = 'access-token';

export async function saveAccessToken(token: string) {
   await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
   return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function removeAccessToken() {
   await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(
   refreshToken: string
) {
   await Keychain.setGenericPassword(
      'refresh-token',
      refreshToken,
      {
         service: REFRESH_TOKEN_SERVICE,
      }
   );
}

export async function getRefreshToken() {
   const credentials =
      await Keychain.getGenericPassword({
         service: REFRESH_TOKEN_SERVICE,
      });

   if (!credentials) {
      return null;
   }

   return credentials.password;
}

export async function removeRefreshToken() {
   await Keychain.resetGenericPassword({
      service: REFRESH_TOKEN_SERVICE,
   });
}