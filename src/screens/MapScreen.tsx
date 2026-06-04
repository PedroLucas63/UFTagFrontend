import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
   View,
   Text,
   TouchableOpacity,
   ActivityIndicator,
   ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { RefreshCw, Battery, Signal, Clock } from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';
import { getDevices, DeviceResponse } from '../api/devices';
import { getLatestLocationsByKeys, LocationResponse } from '../api/locations';
import { getDeviceKeys } from '../storage/devicesStorage';
import { decryptWithPrivateKey } from '../crypto/asymmetric';

type Coords = {
    latitude: number;
    longitude: number;
};
type DevicePin = {
    device: DeviceResponse;
    location: LocationResponse;
    coords: Coords;
};
const INITIAL_REGION = {
    latitude: -27.5954,
    longitude: -48.548,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};



export function MapScreen() {
    const mapRef = useRef<MapView>(null);
    const [pins, setPins] = useState<DevicePin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPin, setSelectedPin] = useState<DevicePin | null>(null);
    
    const loadLocations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setSelectedPin(null);

            const devicesResult = await getDevices();
            if (!devicesResult.ok) {
                setError(devicesResult.error);
                return;
            }
            const devices = devicesResult.data;
            if (devices.length === 0) {
                setPins([]);
                return;
            }

        
            const keyEntries: { device: DeviceResponse; publicKeyB64: string; privateKey: Uint8Array; publicKey: Uint8Array }[] = [];
            for (const device of devices) {
                try {
                    const { publicKey, privateKey } = await getDeviceKeys(device.Id);
                    const { Buffer } = require('buffer');
                    const publicKeyB64 = Buffer.from(publicKey).toString('base64');
                    keyEntries.push({ device, publicKeyB64, publicKey, privateKey });
                } catch {
                // Device sem chaves no Keychain
                }
            }
            if (keyEntries.length === 0) {
                setError('Nenhuma chave encontrada. Abra o app e aguarde sincronizar.');
                return;
            }

            const keys = keyEntries.map((e) => e.publicKeyB64);
            const locsResult = await getLatestLocationsByKeys(keys);
            if (!locsResult.ok) {
                setError(locsResult.error);
                return;
            }

            const locations = locsResult.data;
            const newPins: DevicePin[] = [];
            for (const loc of locations) {
                const entry = keyEntries.find((e) => e.publicKeyB64 === loc.key);
                if (!entry) continue;
                try {
                    const plainJson = await decryptWithPrivateKey(
                        loc.locationEncrypted,
                        entry.publicKey,
                        entry.privateKey,
                    );
                    const coords: Coords = JSON.parse(plainJson);
                    if (
                        typeof coords.latitude === 'number' &&
                        typeof coords.longitude === 'number'
                    ) {
                        newPins.push({ device: entry.device, location: loc, coords });
                    }
                } catch {
                // Falha na descriptografia deste device — pular
                }
            }
            setPins(newPins);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro inesperado');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadLocations();
   }, [loadLocations]);

    
    function formatDate(iso: string) {
        const d = new Date(iso);
        return d.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }



   return (
      <View className="flex-1 bg-slate-50">
         {/* Header */}
         <View className="bg-white border-b border-slate-200 px-5 pb-4 mt-12">
            <View className="flex-row items-center justify-between max-w-md mx-auto w-full">
               <Text className="text-xl font-semibold text-slate-900">
                  Mapa
               </Text>
               <TouchableOpacity
                  onPress={loadLocations}
                  disabled={loading}
                  className="p-2 rounded-full"
                  activeOpacity={0.7}
               >
                  <RefreshCw
                     size={20}
                     color={loading ? '#CBD5E1' : '#334155'}
                  />
               </TouchableOpacity>
            </View>
         </View>
         {/* Mapa */}
         <View className="flex-1">
            {loading ? (
               <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text className="text-slate-500 text-sm mt-3">
                     Carregando localizações...
                  </Text>
               </View>
            ) : error ? (
               <View className="flex-1 items-center justify-center px-8">
                  <Text className="text-red-500 text-center text-sm mb-4">
                     {error}
                  </Text>
                  <TouchableOpacity
                     onPress={loadLocations}
                     className="bg-blue-600 rounded-2xl py-3 px-6"
                  >
                     <Text className="text-white font-semibold">
                        Tentar novamente
                     </Text>
                  </TouchableOpacity>
               </View>
            ) : (
               <>
                  <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        className="flex-1"
                        initialRegion={INITIAL_REGION}
                        showsUserLocation
                        showsMyLocationButton
                  >
                     {pins.map((pin) => (
                        <Marker
                           key={pin.device.Id}
                           coordinate={pin.coords}
                           title={pin.device.Name}
                           pinColor="#2563EB"
                           onPress={() => setSelectedPin(pin)}
                        />
                     ))}
                  </MapView>
                  {/* Card flutuante ao selecionar marcador */}
                  {selectedPin && (
                     <View className="absolute bottom-24 left-4 right-4">
                        <View className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100">
                           <View className="flex-row items-center justify-between mb-3">
                              <Text className="text-base font-semibold text-slate-900">
                                 {selectedPin.device.Name}
                              </Text>
                              <TouchableOpacity
                                 onPress={() => setSelectedPin(null)}
                                 className="p-1"
                              >
                                 <Text className="text-slate-400 text-lg">✕</Text>
                              </TouchableOpacity>
                           </View>
                           <View className="flex-row gap-4">
                              <View className="flex-row items-center gap-1">
                                 <Battery size={14} color="#64748B" />
                                 <Text className="text-sm text-slate-600">
                                    {selectedPin.location.battery}%
                                 </Text>
                              </View>
                              <View className="flex-row items-center gap-1">
                                 <Signal size={14} color="#64748B" />
                                 <Text className="text-sm text-slate-600">
                                    {selectedPin.location.rssi} dBm
                                 </Text>
                              </View>
                              <View className="flex-row items-center gap-1">
                                 <Clock size={14} color="#64748B" />
                                 <Text className="text-sm text-slate-600">
                                    {formatDate(selectedPin.location.createdAt)}
                                 </Text>
                              </View>
                           </View>
                        </View>
                     </View>
                  )}
                  {/* Estado vazio */}
                  {pins.length === 0 && (
                     <View className="absolute top-4 left-4 right-4">
                        <View className="bg-white rounded-2xl px-4 py-3 shadow border border-slate-100 items-center">
                           <Text className="text-sm text-slate-500">
                              Nenhum dispositivo encontrado.
                           </Text>
                        </View>
                     </View>
                  )}
               </>
            )}
         </View>
         <BottomNav />
      </View>
   );
}

