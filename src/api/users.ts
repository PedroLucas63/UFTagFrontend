import { apiClient } from "./client";
import { ApiResult, request } from "./request";

export type UserResponse = {
   id?: string;
   name?: string;
   email?: string;
   phoneNumber?: string;
   isEmailConfirmed?: boolean;
   isPhoneNumberConfirmed?: boolean;
};

export async function getMe(): Promise<ApiResult<UserResponse>> {
   return await request<UserResponse>(
      apiClient.get("/users/me"),
      {
         fallbackError: "Falha ao carregar perfil do usuário",
      }
   );
}

export async function updateName(id: string, name: string): Promise<ApiResult<UserResponse>> {
   return await request<UserResponse>(
      apiClient.put(`/users/${id}/name`, { name }),
      {
         fallbackError: "Falha ao atualizar nome",
      }
   );
}

export async function updatePhoneNumber(id: string, phoneNumber: string): Promise<ApiResult<UserResponse>> {
   return await request<UserResponse>(
      apiClient.put(`/users/${id}/phone-number`, { phoneNumber }),
      {
         fallbackError: "Falha ao atualizar telefone",
      }
   );
}
