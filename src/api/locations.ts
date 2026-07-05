import { getDeviceKeys, updateDeviceState } from "../storage/devicesStorage";
import { fetchLocationText, getNewPublicKeys, getPrivateKeysMap, processLocationDecryption, PublicKeyInfo } from "../utils/locationUtils";
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

/**
 * Pega a última localização de um dispositivo específico.
 */
export async function getLatestLocation(deviceId: string): Promise<ApiResult<LocationResponse>> {
    let publicKey = "";
    let privateKey = "";
    try {
        const keys = await getDeviceKeys(deviceId);
        publicKey = keys.publicKey;
        privateKey = keys.privateKey;
    } catch (e) {
        return { ok: false, error: "Chaves do dispositivo não encontradas" };
    }

    const result = await request<LocationResponse>(
        apiClient.get(`/locations/latest/${encodeURIComponent(publicKey)}`),
        { fallbackError: "Falha ao carregar localização" }
    );

    if (result.ok && result.data.locationEncrypted) {
        const coords = await processLocationDecryption(result.data.locationEncrypted, publicKey, privateKey);

        if (coords) {
            const locationText = await fetchLocationText(coords.lat, coords.lng);

            await updateDeviceState(deviceId, {
                locationLat: coords.lat,
                locationLng: coords.lng,
                locationText: locationText,
                rssi: result.data.rssi.toString(),
                isNear: result.data.rssi > -75,
                battery: result.data.battery,
                lastUpdate: result.data.createdAt,
            });
        }
    }

    return result;
}

/**
 * 2. Atualiza localizações de todos os dispositivos sem precisar de parâmetros na chamada.
 */
export async function getLatestLocationsByKeys(): Promise<ApiResult<LocationResponse[]>> {
    const deviceKeysMap = await getNewPublicKeys();

    const allKeysInfo: PublicKeyInfo[] = Object.values(deviceKeysMap).flat();
    const publicKeysStrings = allKeysInfo.map(k => k.publicKey);

    if (publicKeysStrings.length === 0) {
        return {
            ok: true,
            status: 200,
            data: []
        };
    }

    const params = new URLSearchParams();
    publicKeysStrings.forEach((k) => params.append('keys', k));

    const result = await request<LocationResponse[]>(
        apiClient.get(`/locations/latest-by-keys?${params.toString()}`),
        { fallbackError: "Falha ao carregar localizações" }
    );

    if (result.ok && result.data.length > 0) {
        const privateKeysMap = await getPrivateKeysMap(allKeysInfo);

        const pubKeyToDeviceId: Record<string, string> = {};
        for (const [deviceId, keysList] of Object.entries(deviceKeysMap)) {
            keysList.forEach(k => { pubKeyToDeviceId[k.publicKey] = deviceId; });
        }

        const updatePromises = result.data.map(async (locationItem) => {
            if (!locationItem.locationEncrypted) return;

            const publicKey = locationItem.key;
            const privateKey = privateKeysMap[publicKey];
            const deviceId = pubKeyToDeviceId[publicKey];

            if (!privateKey || !deviceId) return;

            const coords = await processLocationDecryption(locationItem.locationEncrypted, publicKey, privateKey);

            if (coords) {
                const locationText = await fetchLocationText(coords.lat, coords.lng);

                await updateDeviceState(deviceId, {
                    locationLat: coords.lat,
                    locationLng: coords.lng,
                    locationText: locationText,
                    rssi: locationItem.rssi.toString(),
                    isNear: locationItem.rssi > -75,
                    battery: locationItem.battery,
                    lastUpdate: locationItem.createdAt,
                });
            }
        });

        await Promise.all(updatePromises);
    }

    return result;
}

export type LocationReportRequest = {
    Key: string;
    LocationEncrypted: string;
    Rssi: number;
    Battery: number;
    Timestamp: string;
}

export async function reportLocation(locationRequest: LocationReportRequest) {
    await request<void>(
        apiClient.post("/locations/report", locationRequest),
        {
            fallbackError: "Falha ao reportar localização",
        }
    );
}