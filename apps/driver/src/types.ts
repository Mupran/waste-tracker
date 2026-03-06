export interface TruckLocation {
  truckId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number; // km/h
  timestamp: number; // unix ms
  isActive: boolean;
}
