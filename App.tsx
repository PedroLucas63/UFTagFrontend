import { AppNavigator } from "./src/navigation/AppNavigator";
import "./global.css";
import { useEffect } from "react";
import { locationService } from "./src/services/LocationService";
import { tagTrackerService } from "./src/services/TagTrackerService";

export default function App() {
  useEffect(() => {
    locationService.startWatching();
    tagTrackerService.startBackgroundTracking();

    return () => {
      locationService.stopWatching();
      tagTrackerService.stopTracking();
    };
  }, []);
  return <AppNavigator />;
}