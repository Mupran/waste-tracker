import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { TruckLocation } from '../types';

export function useTruckLocations() {
  const [trucks, setTrucks] = useState<TruckLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'truckLocations'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      setTrucks(snapshot.docs.map((d) => d.data() as TruckLocation));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { trucks, loading };
}
