import axios from 'axios';
import { setAuthState } from '../auth/authState';
import { getAccessToken, getRefreshToken, removeAccessToken, removeRefreshToken, saveAccessToken, saveRefreshToken } from '../storage/tokenStorage';

export const apiClient = axios.create({
   baseURL: 'http://127.0.0.1:5156',
   headers: {
      'Content-Type': 'application/json',
   }
});

apiClient.interceptors.request.use(async (config) => {
   const requestUrl = config.url ?? "";
   const skipAuth = [
      "/login",
      "/register",
      "/auth/refresh",
   ].some((path) => requestUrl.includes(path));

   if (skipAuth) {
      return config;
   }

   const token = await getAccessToken();
   if (token) {
      config.headers.Authorization = `Bearer ${token}`;
   }
   return config;
});

let isRefreshing = false;
let failedQueue: Array<{
   resolve: (value?: unknown) => void;
   reject: (reason?: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
   failedQueue.forEach((prom) => {
      if (error) {
         prom.reject(error);
      } else {
         prom.resolve(token);
      }
   });

   failedQueue = [];
}

apiClient.interceptors.response.use(
   (response) => response,

   async (error) => {
      const originalRequest = error.config;

      if (error.response?.status !== 401) {
         return Promise.reject(error);
      }

      if (originalRequest._retry) {
         return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
         return new Promise((resolve, reject) => {
            failedQueue.push({
               resolve: (token) => {
                  originalRequest.headers.Authorization =
                     `Bearer ${token}`;

                  resolve(
                     apiClient(originalRequest)
                  );
               },

               reject,
            });
         });
      }

      isRefreshing = true;

      try {
         const refreshToken =
            await getRefreshToken();

         if (!refreshToken) {
            await removeAccessToken();
            await removeRefreshToken();
            setAuthState(false);
            processQueue(error);
            return Promise.reject(error);
         }

         const response = await apiClient.post(
            '/auth/refresh',
            {
               refreshToken,
            }
         );

         const {
            accessToken,
            refreshToken: newRefreshToken,
         } = response.data;

         await saveAccessToken(
            accessToken
         );
         await saveRefreshToken(
            newRefreshToken
         );

         processQueue(
            null,
            accessToken
         );

         originalRequest.headers.Authorization =
            `Bearer ${accessToken}`;

         return apiClient(originalRequest);
      } catch (refreshError) {
         await removeAccessToken();
         await removeRefreshToken();
         setAuthState(false);

         processQueue(refreshError);

         return Promise.reject(
            refreshError
         );
      } finally {
         isRefreshing = false;
      }
   }
);