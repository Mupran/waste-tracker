import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { TruckLocation, AlertPreference } from '../types';

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useProximityAlert(trucks: TruckLocation[], prefs: AlertPreference | null) {
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!prefs?.notificationsEnabled || trucks.length === 0) return;

    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const { status: locStatus } = await Location.getForegroundPermissionsAsync();
      if (locStatus !== 'granted') return;

      const userLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      for (const truck of trucks) {
        const dist = getDistanceMeters(
          userLoc.coords.latitude,
          userLoc.coords.longitude,
          truck.latitude,
          truck.longitude
        );

        if (dist <= prefs.alertRadiusMeters && !alerted.current.has(truck.truckId)) {
          alerted.current.add(truck.truckId);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Garbage Truck Nearby!',
              body: `A truck is ${Math.round(dist)}m away. Put out your bins!`,
              data: { truckId: truck.truckId },
            },
            trigger: null,
          });
        } else if (dist > prefs.alertRadiusMeters * 1.5) {
          // Reset so we can alert again on the next approach
          alerted.current.delete(truck.truckId);
        }
      }
    })();
  }, [trucks, prefs]);
}
