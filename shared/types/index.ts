export interface TruckLocation {
  truckId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number;   // degrees 0-360
  speed: number;     // km/h
  timestamp: number; // unix ms
  isActive: boolean;
}

export interface TruckRoute {
  truckId: string;
  routeName: string;
  zones: Zone[];
  scheduleDay: string;       // e.g. "Monday"
  estimatedStartTime: string; // e.g. "08:00"
}

export interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface AlertPreference {
  userId: string;
  truckId: string;
  alertRadiusMeters: number; // notify when truck is within this distance
  notificationsEnabled: boolean;
}
