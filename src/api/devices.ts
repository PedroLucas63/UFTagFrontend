import { apiClient } from "./client";
import { request } from "./request";

export type DeviceResponse = {
   Id: string;
   UserId: string;
   Name: string;
   IsActive: boolean;
   CreatedAt: string;
};

export async function getDevices(): Promise<DeviceResponse[]> {
   const response = await request<DeviceResponse[]>(
      apiClient.get("/devices"),
      {
         fallbackError: "Falha ao carregar dispositivos",
      }
   );

   if (response.ok) {
      return response.data;
   }

   return [];
}