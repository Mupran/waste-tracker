import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { AlertPreference } from '../types';

const DEFAULT_RADIUS = 500;
// For a simple single-truck setup, we use a fixed truckId or 'all'
const TRUCK_ID = 'all';

export default function SettingsScreen() {
  const userId = auth.currentUser?.uid ?? 'demo-user';
  const user = { uid: userId, email: auth.currentUser?.email ?? 'demo@local' };
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [alertRadius, setAlertRadius] = useState(DEFAULT_RADIUS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'alertPreferences', userId));
      if (snap.exists()) {
        const prefs = snap.data() as AlertPreference;
        setNotificationsEnabled(prefs.notificationsEnabled);
        setAlertRadius(prefs.alertRadiusMeters);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive proximity alerts.'
        );
        return;
      }
    }
    setNotificationsEnabled(value);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const prefs: AlertPreference = {
        userId: userId,
        truckId: TRUCK_ID,
        alertRadiusMeters: alertRadius,
        notificationsEnabled,
      };
      await setDoc(doc(db, 'alertPreferences', userId), prefs);
      Alert.alert('Saved', 'Your preferences have been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Preferences</Text>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Proximity Notifications</Text>
            <Text style={styles.rowDesc}>Get alerted when a truck is nearby</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#E0E0E0', true: '#90CAF9' }}
            thumbColor={notificationsEnabled ? '#1565C0' : '#BDBDBD'}
          />
        </View>

        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.rowLabel}>Alert Radius</Text>
            <Text style={styles.radiusValue}>{alertRadius}m</Text>
          </View>
          <Text style={styles.rowDesc}>Notify me when a truck is within this distance</Text>
          <Slider
            style={styles.slider}
            minimumValue={100}
            maximumValue={2000}
            step={50}
            value={alertRadius}
            onValueChange={setAlertRadius}
            minimumTrackTintColor="#1565C0"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#1565C0"
            disabled={!notificationsEnabled}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>100m</Text>
            <Text style={styles.sliderLabel}>2km</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.accountRow}>
          <Text style={styles.accountEmail}>{user.email}</Text>
          <TouchableOpacity onPress={() => signOut(auth)}>
            <Text style={styles.signOut}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#757575', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLeft: { flex: 1, marginRight: 16 },
  rowLabel: { fontSize: 16, color: '#212121', fontWeight: '500' },
  rowDesc: { fontSize: 13, color: '#9E9E9E', marginTop: 2 },
  sliderSection: { paddingVertical: 8 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  radiusValue: { fontSize: 16, fontWeight: '700', color: '#1565C0' },
  slider: { width: '100%', marginTop: 8 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 11, color: '#9E9E9E' },
  saveButton: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  accountEmail: { fontSize: 14, color: '#757575' },
  signOut: { fontSize: 14, color: '#D32F2F' },
});
