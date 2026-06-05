import { apiClient } from "./client";
import { ApiResult, request } from "./request";

export type DeviceResponse = {
   id: string;
   userId: string;
   name: string;
   isActive: boolean;
   encryptedPrivateKey: string;
   encryptedPublicKey: string;
   keysSalt: string;
   createdAt: string;
};

export async function getDevices(): Promise<ApiResult<DeviceResponse[]>> {
   return await request<DeviceResponse[]>(
      apiClient.get("/devices"),
      {
         fallbackError: "Falha ao carregar dispositivos",
      }
   );
}

export type PublicDeviceResponse = {
   nameUser?: string;
   nameDevice?: string;
   phoneNumber?: string;
   email?: string;
   isActive?: boolean;
};

export async function getPublicDevice(id: string): Promise<ApiResult<PublicDeviceResponse>> {
   return await request<PublicDeviceResponse>(
      apiClient.get(`/devices/public/${id}`),
      {
         fallbackError: "Falha ao carregar informações do proprietário",
      }
   );
}

export async function createDevice(name: string, publicId: string): Promise<ApiResult<DeviceResponse>> {
   return await request<DeviceResponse>(
      apiClient.post("/devices", { name, publicId }),
      {
         fallbackError: "Falha ao cadastrar dispositivo",
      }
   );
}