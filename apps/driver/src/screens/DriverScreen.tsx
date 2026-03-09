import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useLocationBroadcast } from '../hooks/useLocationBroadcast';

export default function DriverScreen() {
  const driverId = auth.currentUser?.uid ?? 'demo-driver';
  const { isTracking, currentLocation, error, startTracking, stopTracking } =
    useLocationBroadcast(driverId);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [currentLocation]);

  function handleToggle() {
    if (isTracking) {
      Alert.alert('Stop Tracking', 'Stop broadcasting your location to residents?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: stopTracking },
      ]);
    } else {
      startTracking();
    }
  }

  async function handleSignOut() {
    if (isTracking) await stopTracking();
    if (auth.currentUser) await signOut(auth);
  }

  const speed = currentLocation?.coords.speed
    ? (currentLocation.coords.speed * 3.6).toFixed(1)
    : '0.0';
  const heading = currentLocation?.coords.heading?.toFixed(0) ?? '—';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        followsUserLocation={isTracking}
        initialRegion={{
          latitude: currentLocation?.coords.latitude ?? 0,
          longitude: currentLocation?.coords.longitude ?? 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            }}
            title="Your Location"
            pinColor="#2E7D32"
          />
        )}
      </MapView>

      <View style={styles.panel}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{speed}</Text>
            <Text style={styles.statLabel}>km/h</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{heading}°</Text>
            <Text style={styles.statLabel}>Heading</Text>
          </View>
          <View style={styles.stat}>
            <View
              style={[
                styles.statusDot,
                isTracking ? styles.dotActive : styles.dotInactive,
              ]}
            />
            <Text style={styles.statLabel}>{isTracking ? 'Live' : 'Off'}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.trackButton, isTracking ? styles.stopButton : styles.startButton]}
          onPress={handleToggle}
        >
          <Text style={styles.trackButtonText}>
            {isTracking ? 'Stop Broadcasting' : 'Start Broadcasting'}
          </Text>
        </TouchableOpacity>
      </View>
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
  signOut: { fontSize: 14, color: '#D32F2F' },
  map: { flex: 1 },
  panel: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#212121' },
  statLabel: { fontSize: 12, color: '#757575', marginTop: 2 },
  statusDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 2 },
  dotActive: { backgroundColor: '#4CAF50' },
  dotInactive: { backgroundColor: '#BDBDBD' },
  error: { color: '#D32F2F', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  trackButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  startButton: { backgroundColor: '#2E7D32' },
  stopButton: { backgroundColor: '#D32F2F' },
  trackButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
