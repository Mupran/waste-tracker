import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from './src/firebase';
import { LOCATION_TASK_NAME } from './src/hooks/useLocationBroadcast';
import AppNavigator from './src/navigation/AppNavigator';

// Must be defined at module level — not inside a component
TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    if (!location) return;

    const user = getAuth().currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'truckLocations', user.uid), {
        truckId: user.uid,
        driverId: user.uid,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading ?? 0,
        speed: location.coords.speed ? location.coords.speed * 3.6 : 0,
        timestamp: location.timestamp,
        isActive: true,
      });
    } catch (err) {
      console.error('Failed to write location:', err);
    }
  }
);

export default function App() {
  return <AppNavigator />;
}
