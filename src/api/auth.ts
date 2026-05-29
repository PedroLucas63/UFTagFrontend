import {
   removeAccessToken,
   removeRefreshToken,
   saveAccessToken,
   saveRefreshToken,
} from "../storage/tokenStorage";
import { apiClient } from "./client";
import {
   ApiResult,
   request,
} from "./request";

type LoginResponse = {
   accessToken: string;
   refreshToken: string;
};

export async function login(
   email: string,
   password: string
): Promise<ApiResult<LoginResponse>> {
   const result = await request<LoginResponse>(
      apiClient.post("/login", {
         email,
         password,
      }),
      {
         errorMap: {
            401: "E-mail ou senha inválidos",
            423: "Usuário bloqueado",
         },
         fallbackError: "Falha ao entrar",
      }
   );

   if (!result.ok) {
      return result;
   }

   const { accessToken, refreshToken } =
      result.data;

   if (!accessToken || !refreshToken) {
      return {
         ok: false,
         error: "Resposta de login inválida",
         status: result.status,
      };
   }

   await saveAccessToken(accessToken);
   await saveRefreshToken(refreshToken);

   return result;
}

export async function register(
   email: string,
   password: string
): Promise<ApiResult<void>> {
   return request(
      apiClient.post("/register", {
         email,
         password,
      }),
      {
         fallbackError: "Falha ao cadastrar",
      }
   );
}

export async function forgotPassword(
   email: string
): Promise<ApiResult<void>> {
   return request(
      apiClient.post("/forgotPassword", {
         email,
      }),
      {
         fallbackError: "Falha ao redefinir senha",
         errorMap: {
            400: "Email inválido",
         },
      }
   );
}

export async function logout(): Promise<void> {
   await removeAccessToken();
   await removeRefreshToken();
}