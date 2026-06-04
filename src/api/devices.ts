import { createLocalDevice, getLocalDevices, LocalDevice, saveDevices } from "../storage/devicesStorage";
import { apiClient } from "./client";
import { ApiFailure, ApiResult, ApiSuccess, request } from "./request";

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

export async function getDevices(): Promise<ApiResult<LocalDevice[]>> {
   const localDevices = await getLocalDevices();

   if (localDevices.needsBackgroundSync) {
      const response = await request<DeviceResponse[]>(
         apiClient.get("/devices"),
         {
            fallbackError: "Falha ao carregar dispositivos",
         }
      );

      if (response.ok) {
         await saveDevices(response.data);
         const result: ApiSuccess<LocalDevice[]> = {
            ok: true,
            data: response.data.map(createLocalDevice),
            status: response.status,
         };
         return result;
      } else {
         const result: ApiFailure = {
            ok: false,
            error: response.error,
            status: response.status,
         };
         return result;
      }
   }

   const result: ApiSuccess<LocalDevice[]> = {
      ok: true,
      data: localDevices.devices,
      status: 200,
   };
   return result;
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