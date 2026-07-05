import { AppNavigator } from "./src/navigation/AppNavigator";
import "./global.css";
import { useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { locationService } from "./src/services/LocationService";
import { tagTrackerService } from "./src/services/TagTrackerService";
import { subscribeAuthState } from "./src/auth/authState";
import BackgroundJob from "react-native-background-actions";

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(resolve, time));

const taskBackgroundTracking = async (taskDataArguments: any) => {
  const { delay } = taskDataArguments;
  await tagTrackerService.startBackgroundTracking();
  while (BackgroundJob.isRunning()) {
    await sleep(delay);
  }
};

const options = {
  taskName: "TagTrackerTask",
  taskTitle: "UFTag Rastreamento",
  taskDesc: "Rastreamento de tags UFTag em segundo plano.",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#2563eb",
  parameters: {
    delay: 5000,
  },
  foregroundServiceType: ["location", "connectedDevice"] as Array<"location" | "connectedDevice">,
};

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "ios") return true;

  if (Platform.OS === "android") {
    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        result["android.permission.BLUETOOTH_CONNECT"] === "granted" &&
        result["android.permission.BLUETOOTH_SCAN"] === "granted" &&
        result["android.permission.ACCESS_FINE_LOCATION"] === "granted"
      );
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === "granted";
    }
  }
  return true;
}

export default function App() {
  useEffect(() => {
    const handleAuthChange = async (isAuthenticated: boolean) => {
      if (isAuthenticated) {
        const granted = await requestPermissions();
        if (granted) {
          locationService.startWatching();
          if (!BackgroundJob.isRunning()) {
            BackgroundJob.start(taskBackgroundTracking, options).catch((err: any) => {
              console.error("Erro ao iniciar o rastreamento em segundo plano:", err);
            });
          } else {
            // Se o background job já estiver rodando, força o recarregamento das chaves
            // e reinicia o scan BLE para as novas tags
            await tagTrackerService.startBackgroundTracking();
          }
        } else {
          console.log("[App] Permissões negadas. Rastreamento em segundo plano não foi iniciado.");
        }
      } else {
        // Usuário deslogado: para rastreamento e limpa estado em memória
        locationService.stopWatching();
        tagTrackerService.clearState();
        if (BackgroundJob.isRunning()) {
          try {
            await BackgroundJob.stop();
          } catch (err) {
            console.error("Erro ao parar o background job:", err);
          }
        }
      }
    };

    const unsubscribe = subscribeAuthState((isAuthenticated) => {
      handleAuthChange(isAuthenticated);
    });

    return () => {
      unsubscribe();
      locationService.stopWatching();
      tagTrackerService.stopTracking();
      if (BackgroundJob.isRunning()) {
        BackgroundJob.stop();
      }
    };
  }, []);

  return <AppNavigator />;
}