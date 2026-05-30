import { apiClient } from "./client";
import { ApiResult, request } from "./request";

export type DeviceResponse = {
   Id: string;
   UserId: string;
   Name: string;
   IsActive: boolean;
   CreatedAt: string;
};

export async function getDevices(): Promise<ApiResult<DeviceResponse[]>> {
   return await request<DeviceResponse[]>(
      apiClient.get("/devices"),
      {
         fallbackError: "Falha ao carregar dispositivos",
      }
   );
}