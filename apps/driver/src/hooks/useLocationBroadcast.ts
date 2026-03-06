import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const LOCATION_TASK_NAME = 'background-location-task';

export function useLocationBroadcast(driverId: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTracking = useCallback(async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      setError('Location permission denied.');
      return;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      setError('Background location denied — will only track while app is open.');
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setCurrentLocation(loc);

    const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!hasTask) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Waste Tracker Active',
          notificationBody: 'Broadcasting your location to residents.',
          notificationColor: '#2E7D32',
        },
      });
    }

    setIsTracking(true);
    setError(null);
  }, []);

  const stopTracking = useCallback(async () => {
    const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (hasTask) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    try {
      await updateDoc(doc(db, 'truckLocations', driverId), { isActive: false });
    } catch {
      // Document may not exist yet — safe to ignore
    }
    setIsTracking(false);
  }, [driverId]);

  return { isTracking, currentLocation, error, startTracking, stopTracking };
}
