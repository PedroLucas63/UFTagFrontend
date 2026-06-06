import Geolocation, {
   GeoPosition,
   GeoError,
} from 'react-native-geolocation-service';

export type Coords = {
   latitude: number;
   longitude: number;
};

type WatchCallback = (coords: Coords | null) => void;

class LocationService {
   private watchId: number | null = null;
   private lastCoords: Coords | null = null;
   private listeners: Set<WatchCallback> = new Set();

   /**
    * Pega localização atual (one-shot)
    */
   getCurrentPosition(): Promise<Coords | null> {
      return new Promise((resolve) => {
         let timeout: ReturnType<typeof setTimeout>;

         Geolocation.getCurrentPosition(
            (position: GeoPosition) => {
               clearTimeout(timeout);

               const coords = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
               };

               this.lastCoords = coords;
               resolve(coords);
            },
            (error: GeoError) => {
               clearTimeout(timeout);
               console.log('[LocationService] getCurrentPosition error:', error);
               resolve(null);
            },
            {
               enableHighAccuracy: true,
               timeout: 10000,
               maximumAge: 20000,
               forceRequestLocation: true,
               showLocationDialog: true,
            }
         );

         timeout = setTimeout(() => {
            console.warn('[LocationService] timeout');
            resolve(null);
         }, 12000);
      });
   }

   /**
    * Inicia tracking contínuo (foreground)
    */
   startWatching() {
      if (this.watchId !== null) return;

      this.watchId = Geolocation.watchPosition(
         (position: GeoPosition) => {
            const coords = {
               latitude: position.coords.latitude,
               longitude: position.coords.longitude,
            };

            this.lastCoords = coords;
            this.emit(coords);
         },
         (error: GeoError) => {
            console.log('[LocationService] watch error:', error);
            this.emit(null);
         },
         {
            enableHighAccuracy: true,
            distanceFilter: 5,
            interval: 5000,
            fastestInterval: 2000,
         }
      );
   }

   /**
    * Para tracking
    */
   stopWatching() {
      if (this.watchId !== null) {
         Geolocation.clearWatch(this.watchId);
         this.watchId = null;
      }
   }

   /**
    * Última posição conhecida
    */
   getLastKnownPosition(): Coords | null {
      return this.lastCoords;
   }

   /**
    * Subscribe para updates de localização
    */
   subscribe(callback: WatchCallback) {
      this.listeners.add(callback);

      // já entrega último valor conhecido
      if (this.lastCoords) {
         callback(this.lastCoords);
      }

      return () => {
         this.listeners.delete(callback);
      };
   }

   private emit(coords: Coords | null) {
      for (const listener of this.listeners) {
         listener(coords);
      }
   }
}

export const locationService = new LocationService();