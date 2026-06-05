import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
   View,
   Text,
   TouchableOpacity,
   ActivityIndicator,
   ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { RefreshCw, Battery, Signal, Clock, MapPin } from 'lucide-react-native';
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

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Raio da Terra em metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) *
            Math.cos(phi2) *
            Math.sin(deltaLambda / 2) *
            Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

const WHITE_MAP_STYLE = [
  {
    "featureType": "all",
    "elementType": "labels",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [
      { "color": "#f8f9fa" }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      { "color": "#e9ecef" }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      { "color": "#dee2e6" }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      { "color": "#e2e8f0" }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      { "color": "#f8f9fa" }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [
      { "color": "#f8f9fa" }
    ]
  }
];



export function MapScreen() {
    const mapRef = useRef<MapView>(null);
    const [pins, setPins] = useState<DevicePin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPin, setSelectedPin] = useState<DevicePin | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    function getMarkerColor(pin: DevicePin) {
        if (!userLocation) {
            return '#10B981'; // Verde por padrão se não souber a localização do usuário
        }
        const distance = getDistanceInMeters(
            userLocation.latitude,
            userLocation.longitude,
            pin.coords.latitude,
            pin.coords.longitude
        );

        if (distance < 50) {
            return '#10B981'; // Verde (< 50m)
        } else if (distance < 200) {
            return '#F59E0B'; // Laranja (50m - 200m)
        } else {
            return '#EF4444'; // Vermelho (> 200m)
        }
    }
    
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
                    const { publicKey, privateKey } = await getDeviceKeys(device.id);
                    const { Buffer } = require('buffer');
                    const publicKeyB64 = Buffer.from(publicKey).toString('base64');
                    keyEntries.push({ device, publicKeyB64, publicKey, privateKey });
                } catch {
                // Device sem chaves no Keychain
                }
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
                        style={{ flex: 1 }}
                        initialRegion={INITIAL_REGION}
                        showsUserLocation
                        showsMyLocationButton
                        customMapStyle={WHITE_MAP_STYLE}
                        onUserLocationChange={(event) => {
                            const coords = event.nativeEvent.coordinate;
                            if (coords) {
                                setUserLocation({
                                    latitude: coords.latitude,
                                    longitude: coords.longitude,
                                });
                            }
                        }}
                  >
                     {pins.map((pin) => (
                        <Marker
                           key={pin.device.id}
                           coordinate={pin.coords}
                           onPress={() => setSelectedPin(pin)}
                        >
                           <View className="items-center">
                              {/* Círculo do Marcador */}
                              <View 
                                 style={{ backgroundColor: getMarkerColor(pin) }} 
                                 className="w-10 h-10 rounded-full border-2 border-white items-center justify-center shadow-lg"
                              >
                                 <MapPin size={18} color="#FFFFFF" />
                              </View>
                              {/* Balão com o Nome */}
                              <View className="mt-1 bg-white rounded-full px-3 py-1 shadow border border-slate-100">
                                 <Text className="text-slate-800 text-[11px] font-bold">
                                    {pin.device.name}
                                 </Text>
                              </View>
                           </View>
                        </Marker>
                     ))}
                  </MapView>
                  {/* Card flutuante ao selecionar marcador */}
                  {selectedPin && (
                     <View className="absolute bottom-24 left-4 right-4">
                        <View className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100">
                           <View className="flex-row items-center justify-between mb-3">
                              <Text className="text-base font-semibold text-slate-900">
                                 {selectedPin.device.name}
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

