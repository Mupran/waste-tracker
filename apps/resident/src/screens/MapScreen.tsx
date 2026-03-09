import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTruckLocations } from '../hooks/useTruckLocation';
import { useProximityAlert } from '../hooks/useProximityAlert';
import { AlertPreference, TruckLocation } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

function formatETA(distanceMeters: number, speedKmh: number): string {
  if (speedKmh < 1) return 'Stopped';
  const distKm = distanceMeters / 1000;
  const hours = distKm / speedKmh;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return 'Arriving now';
  if (minutes === 1) return '~1 min away';
  return `~${minutes} mins away`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function MapScreen() {
  const userId = auth.currentUser?.uid ?? 'demo-user';
  const { trucks, loading } = useTruckLocations();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [prefs, setPrefs] = useState<AlertPreference | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<TruckLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  // Load alert preferences from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'alertPreferences', userId), (snap) => {
      if (snap.exists()) setPrefs(snap.data() as AlertPreference);
    });
    return unsub;
  }, [userId]);

  // Request location and notification permissions on mount
  useEffect(() => {
    (async () => {
      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      if (notifStatus !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        setLocationError('Location permission denied. Enable it in Settings.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation(loc);

      // Center map on user
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });

      // Watch for location updates
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 },
        (newLoc) => setUserLocation(newLoc)
      );
      return () => sub.remove();
    })();
  }, []);

  useProximityAlert(trucks, prefs);

  // Auto-select nearest truck
  useEffect(() => {
    if (!userLocation || trucks.length === 0) return;
    const nearest = trucks.reduce<TruckLocation | null>((closest, truck) => {
      if (!closest) return truck;
      const dCurrent = getDistanceMeters(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        truck.latitude,
        truck.longitude
      );
      const dClosest = getDistanceMeters(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        closest.latitude,
        closest.longitude
      );
      return dCurrent < dClosest ? truck : closest;
    }, null);
    setSelectedTruck(nearest);
  }, [trucks, userLocation]);

  const nearestDistance =
    selectedTruck && userLocation
      ? getDistanceMeters(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          selectedTruck.latitude,
          selectedTruck.longitude
        )
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Truck Tracker</Text>
        <View style={styles.headerBadge}>
          <View style={[styles.dot, trucks.length > 0 ? styles.dotLive : styles.dotOff]} />
          <Text style={styles.headerBadgeText}>
            {trucks.length > 0 ? `${trucks.length} truck${trucks.length > 1 ? 's' : ''} active` : 'No trucks active'}
          </Text>
        </View>
      </View>

      {locationError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.loadingText}>Connecting to live feed...</Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            showsUserLocation
            showsMyLocationButton
            initialRegion={
              userLocation
                ? {
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
                : {
                    latitude: 0,
                    longitude: 0,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
            }
          >
            {trucks.map((truck) => (
              <Marker
                key={truck.truckId}
                coordinate={{ latitude: truck.latitude, longitude: truck.longitude }}
                title="Garbage Truck"
                description={`Speed: ${truck.speed.toFixed(1)} km/h`}
                onPress={() => setSelectedTruck(truck)}
              >
                <View style={styles.truckMarker}>
                  <Text style={styles.truckMarkerEmoji}>🚛</Text>
                </View>
              </Marker>
            ))}

            {prefs?.notificationsEnabled && userLocation && (
              <Circle
                center={{
                  latitude: userLocation.coords.latitude,
                  longitude: userLocation.coords.longitude,
                }}
                radius={prefs.alertRadiusMeters}
                strokeColor="rgba(21, 101, 192, 0.4)"
                fillColor="rgba(21, 101, 192, 0.08)"
              />
            )}
          </MapView>

          {selectedTruck && nearestDistance !== null ? (
            <View style={styles.infoPanel}>
              <View style={styles.infoPanelRow}>
                <View>
                  <Text style={styles.infoPanelLabel}>Nearest Truck</Text>
                  <Text style={styles.infoPanelDistance}>
                    {formatDistance(nearestDistance)}
                  </Text>
                </View>
                <View style={styles.infoPanelRight}>
                  <Text style={styles.infoPanelETA}>
                    {formatETA(nearestDistance, selectedTruck.speed)}
                  </Text>
                  <Text style={styles.infoPanelSpeed}>
                    {selectedTruck.speed.toFixed(1)} km/h
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.focusButton}
                onPress={() =>
                  mapRef.current?.animateToRegion({
                    latitude: selectedTruck.latitude,
                    longitude: selectedTruck.longitude,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                  })
                }
              >
                <Text style={styles.focusButtonText}>Focus on Truck</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoPanel}>
              <Text style={styles.noTruckText}>
                {trucks.length === 0
                  ? 'No active trucks in your area right now.'
                  : 'Tap a truck on the map to see details.'}
              </Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#212121' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLive: { backgroundColor: '#4CAF50' },
  dotOff: { backgroundColor: '#BDBDBD' },
  headerBadgeText: { fontSize: 13, color: '#757575' },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: { color: '#C62828', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#757575', fontSize: 14 },
  map: { flex: 1 },
  truckMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#2E7D32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  truckMarkerEmoji: { fontSize: 22 },
  infoPanel: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  infoPanelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoPanelLabel: { fontSize: 12, color: '#9E9E9E', marginBottom: 2 },
  infoPanelDistance: { fontSize: 26, fontWeight: '700', color: '#212121' },
  infoPanelRight: { alignItems: 'flex-end' },
  infoPanelETA: { fontSize: 16, fontWeight: '600', color: '#1565C0' },
  infoPanelSpeed: { fontSize: 13, color: '#9E9E9E', marginTop: 2 },
  focusButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  focusButtonText: { color: '#1565C0', fontWeight: '600', fontSize: 14 },
  noTruckText: { textAlign: 'center', color: '#9E9E9E', fontSize: 14, paddingVertical: 8 },
});
