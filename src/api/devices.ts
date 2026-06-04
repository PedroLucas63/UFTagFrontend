import { saveDevices } from "../storage/devicesStorage";
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
   const devices = await request<DeviceResponse[]>(
      apiClient.get("/devices"),
      {
         fallbackError: "Falha ao carregar dispositivos",
      }
   );

   if (devices.ok) {
      await saveDevices(devices.data);
   }

   return devices;
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

export type CreateDeviceRequest = {
   Name: string;
   PublicId: string;
   EncryptedPublicKey: string;
   EncryptedPrivateKey: string;
   KeysSalt: string;
};

export async function createDevice(
   device: CreateDeviceRequest
): Promise<ApiResult<DeviceResponse>> {
   return await request<DeviceResponse>(
      apiClient.post("/devices", device),
      {
         fallbackError: "Falha ao cadastrar dispositivo",
      }
   );
}