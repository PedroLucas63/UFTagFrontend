import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, PermissionsAndroid, Platform } from 'react-native';
import { Map, Camera, Marker, UserLocation, StyleSpecification } from '@maplibre/maplibre-react-native';
import { RefreshCw, Battery, Signal, Clock, MapPin, Map as MapIcon } from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';
import { getLatestLocationsByKeys } from '../api/locations';
import { getLocalDevices, LocalDevice } from '../storage/devicesStorage';
import { useRoute } from '@react-navigation/native';
import { locationService } from '../services/LocationService';

type Coords = {
   latitude: number;
   longitude: number;
};

const DEFAULT_CENTER: Coords = {
   latitude: -27.5954,
   longitude: -48.548,
};

const DEFAULT_ZOOM = 12;
const TARGET_ZOOM = 16;

const OSM_STYLE: StyleSpecification = {
   version: 8,
   sources: {
      osm: {
         type: 'raster',
         tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
         tileSize: 256,
         maxzoom: 19,
         attribution: '© OpenStreetMap contributors',
      },
   },
   layers: [
      {
         id: 'osm-raster',
         type: 'raster',
         source: 'osm',
      },
   ],
} as const;

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
   const R = 6371e3;
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

function formatDate(iso: string | null) {
   if (!iso) return '-';

   const d = new Date(iso);
   return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
   });
}

async function requestAndroidLocationPermission(): Promise<boolean> {
   if (Platform.OS !== 'android') return true;

   const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
   );

   return result === PermissionsAndroid.RESULTS.GRANTED;
}

type RouteParams = {
   deviceId?: string;
};

export function MapScreen() {
   const route = useRoute();

   const deviceId =
      (route.params as RouteParams | undefined)?.deviceId;

   const cameraRef = useRef<any>(null);

   const [devices, setDevices] = useState<LocalDevice[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [selectedPin, setSelectedPin] = useState<LocalDevice | null>(null);
   const [userLocation, setUserLocation] = useState<Coords | null>(null);
   const [mapReady, setMapReady] = useState(false);

   const [initialViewState, setInitialViewState] = useState({
      center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude] as [number, number],
      zoom: DEFAULT_ZOOM,
   });

   function getMarkerColor(device: LocalDevice) {
      if (!userLocation || device.locationLat === null || device.locationLng === null) {
         return '#10B981';
      }

      const distance = getDistanceInMeters(
         userLocation.latitude,
         userLocation.longitude,
         device.locationLat,
         device.locationLng,
      );

      if (distance < 50) return '#10B981';
      if (distance < 200) return '#F59E0B';
      return '#EF4444';
   }

   const centerMap = useCallback((coords: Coords, zoom = TARGET_ZOOM) => {
      cameraRef.current?.flyTo({
         center: [coords.longitude, coords.latitude],
         duration: 900,
      });

      cameraRef.current?.zoomTo(zoom, {
         duration: 900,
      });
   }, []);

   const loadLocations = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         setSelectedPin(null);

         const locsResult = await getLatestLocationsByKeys();
         if (!locsResult.ok) {
            console.warn('Falha ao atualizar API, mostrando dados do cache local.');
         }

         const { devices: localDevices } = await getLocalDevices();

         const validDevices = localDevices.filter(
            (d) => d.locationLat !== null && d.locationLng !== null,
         );

         if (validDevices.length === 0 && !locsResult.ok) {
            setError(locsResult.error || 'Falha ao carregar localizações');
            return;
         }

         setDevices(validDevices);

         const gps = await locationService.getCurrentPosition();
         setUserLocation(gps);

         if (deviceId) {
            const targetDevice = validDevices.find((d) => d.id === deviceId);
            if (targetDevice && targetDevice.locationLat !== null && targetDevice.locationLng !== null) {
               const targetCoords = {
                  latitude: targetDevice.locationLat,
                  longitude: targetDevice.locationLng,
               };

               setInitialViewState({
                  center: [targetCoords.longitude, targetCoords.latitude],
                  zoom: TARGET_ZOOM,
               });

               setSelectedPin(targetDevice);

               if (mapReady) {
                  centerMap(targetCoords, TARGET_ZOOM);
               }
            } else if (gps) {
               setInitialViewState({
                  center: [gps.longitude, gps.latitude],
                  zoom: DEFAULT_ZOOM,
               });
            }
         } else if (gps) {
            setInitialViewState({
               center: [gps.longitude, gps.latitude],
               zoom: DEFAULT_ZOOM,
            });

            if (mapReady) {
               centerMap(gps, DEFAULT_ZOOM);
            }
         } else {
            setInitialViewState({
               center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
               zoom: DEFAULT_ZOOM,
            });
         }
      } catch (e) {
         setError(e instanceof Error ? e.message : 'Erro inesperado');
      } finally {
         setLoading(false);
      }
   }, [centerMap, mapReady, deviceId]);

   useEffect(() => {
      loadLocations();
   }, [loadLocations]);

   return (
      <View className="flex-1 bg-slate-50">
         <View className="bg-white border-b border-slate-200 px-5 pb-4 mt-12">
            <View className="flex-row items-center justify-between max-w-md mx-auto w-full">
               <Text className="text-xl font-semibold text-slate-900">Mapa</Text>

               <TouchableOpacity
                  onPress={loadLocations}
                  disabled={loading}
                  className="p-2 rounded-full"
                  activeOpacity={0.7}
               >
                  <RefreshCw size={20} color={loading ? '#CBD5E1' : '#334155'} />
               </TouchableOpacity>
            </View>
         </View>

         <View className="flex-1">
            {loading && devices.length === 0 ? (
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
                     <Text className="text-white font-semibold">Tentar novamente</Text>
                  </TouchableOpacity>
               </View>
            ) : (
               <>
                  <Map
                     style={{ flex: 1 }}
                     mapStyle={OSM_STYLE}
                     onDidFinishLoadingStyle={() => setMapReady(true)}
                  >
                     <Camera
                        ref={cameraRef}
                        initialViewState={initialViewState}
                     />

                     <UserLocation animated accuracy heading />

                     {devices.map((device) => {
                        if (device.locationLat === null || device.locationLng === null) {
                           return null;
                        }

                        return (
                           <Marker
                              key={device.id}
                              lngLat={[device.locationLng, device.locationLat]}
                              onPress={() => setSelectedPin(device)}
                           >
                              <View className="items-center">
                                 <View
                                    style={{ backgroundColor: getMarkerColor(device) }}
                                    className="w-10 h-10 rounded-full border-2 border-white items-center justify-center shadow-lg"
                                 >
                                    <MapPin size={18} color="#FFFFFF" />
                                 </View>

                                 <View className="mt-1 bg-white rounded-full px-3 py-1 shadow border border-slate-100">
                                    <Text className="text-slate-800 text-[11px] font-bold">
                                       {device.name}
                                    </Text>
                                 </View>
                              </View>
                           </Marker>
                        );
                     })}
                  </Map>

                  {selectedPin && (
                     <View className="absolute bottom-24 left-4 right-4">
                        <View className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100">
                           <View className="flex-row items-center justify-between mb-3">
                              <Text className="text-base font-semibold text-slate-900">
                                 {selectedPin.name}
                              </Text>

                              <TouchableOpacity
                                 onPress={() => setSelectedPin(null)}
                                 className="p-1"
                              >
                                 <Text className="text-slate-400 text-lg">✕</Text>
                              </TouchableOpacity>
                           </View>

                           <View className="flex-row items-center gap-2 mb-3">
                              <MapIcon size={14} color="#64748B" />
                              <Text className="text-xs text-slate-500 flex-1" numberOfLines={2}>
                                 {selectedPin.locationText !== '-' ? selectedPin.locationText : 'Endereço desconhecido'}
                              </Text>
                           </View>

                           <View className="flex-row gap-4 border-t border-slate-100 pt-3 mt-1">
                              <View className="flex-row items-center gap-1">
                                 <Battery size={14} color="#64748B" />
                                 <Text className="text-sm text-slate-600">
                                    {selectedPin.battery !== null ? `${selectedPin.battery}%` : '-'}
                                 </Text>
                              </View>

                              <View className="flex-row items-center gap-1">
                                 <Signal size={14} color="#64748B" />
                                 <Text className="text-sm text-slate-600">
                                    {selectedPin.rssi} dBm
                                 </Text>
                              </View>

                              <View className="flex-row items-center gap-1">
                                 <Clock size={14} color="#64748B" />
                                 <Text className="text-sm text-slate-600">
                                    {formatDate(selectedPin.lastUpdate)}
                                 </Text>
                              </View>
                           </View>
                        </View>
                     </View>
                  )}

                  {devices.length === 0 && !loading && (
                     <View className="absolute top-4 left-4 right-4">
                        <View className="bg-white rounded-2xl px-4 py-3 shadow border border-slate-100 items-center">
                           <Text className="text-sm text-slate-500">
                              Nenhum dispositivo encontrado no mapa.
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