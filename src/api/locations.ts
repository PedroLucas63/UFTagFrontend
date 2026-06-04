import { apiClient } from "./client";
import { ApiResult, request } from "./request";

export type LocationResponse = {
  id: string;
  key: string;
  locationEncrypted: string;
  rssi: number;
  battery: number;
  createdAt: string;
};

export async function getLatestLocation(key: string): Promise<ApiResult<LocationResponse>>{
    return await request<LocationResponse>(
        apiClient.get(`/locations/latest/${key}`),
        {
            fallbackError: "Falha ao carregar localização",
        }
    );
}

export async function getLatestLocationsByKeys(keys: string[]): Promise<ApiResult<LocationResponse[]>>{
    const params = new URLSearchParams();
    keys.forEach((k) => params.append('keys', k));

    return await request<LocationResponse[]>(
        apiClient.get(`/locations/latest-by-keys?${params.toString()}`),
        {
            fallbackError: "Falha ao carregar localizações",
        }
    );
}

