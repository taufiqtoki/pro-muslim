import { useState, useEffect } from 'react';
import { addMinutes, subMinutes } from 'date-fns';
import { getPrayerTimes, PrayerSettings } from '../services/prayerApi.ts';
import { useAuth } from './useAuth.ts';
import { doc, onSnapshot, setDoc, FirestoreError } from 'firebase/firestore';
import { db } from '../firebase.ts';

const DEFAULT_SETTINGS: PrayerSettings = {
  method: 5, // Karachi
  school: 1, // Hanafi
  location: {
    city: 'Chittagong Division',
    country: 'Bangladesh',
    latitude: 22.356851,
    longitude: 91.783182
  },
  adjustments: {
    Fajr: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0,
    Tahajjud: 0
  },
  jamaatAdjustments: {
    Fajr: 20,
    Dhuhr: 15,
    Asr: 15,
    Maghrib: 5,
    Isha: 15,
    Tahajjud: 0
  }
};

export const usePrayerTimes = () => {
  const { user } = useAuth();
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [jamaatTimes, setJamaatTimes] = useState<any>(null);
  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [completed, setCompleted] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings and calculate times
  useEffect(() => {
    if (!user) return;

    const unsubSettings = onSnapshot(doc(db, `users/${user.uid}/settings/prayer`), 
      async (docSnapshot) => {
        if (!docSnapshot.exists()) {
          // If no settings exist, create default settings
          const settingsDoc = doc(db, `users/${user.uid}/settings/prayer`);
          await setDoc(settingsDoc, {
            ...DEFAULT_SETTINGS,
            createdAt: new Date()
          });
          setSettings(DEFAULT_SETTINGS);
        } else {
          setSettings(docSnapshot.data() as PrayerSettings);
        }
        setLoading(false);
      }, (error: FirestoreError) => {
        setError(error.message);
        setLoading(false);
      });

    return () => unsubSettings();
  }, [user]);

  // Calculate prayer times when settings change
  useEffect(() => {
    if (!settings) return;

    const calculateTimes = async () => {
      try {
        const times = await getPrayerTimes(settings, new Date());
        setPrayerTimes(times);

        // Calculate Jamaat times
        const jamaat: {[key: string]: Date} = {};
        Object.keys(times).forEach(prayer => {
          const azanTime = new Date(times[prayer]);
          jamaat[prayer] = addMinutes(azanTime, settings.jamaatAdjustments[prayer] || 0);
        });

        // Calculate Tahajjud time as 30 minutes before Fajr
        if (times.Fajr) {
          jamaat.Tahajjud = subMinutes(new Date(times.Fajr), 30);
        }

        setJamaatTimes(jamaat);
      } catch (error) {
        console.error('Error calculating prayer times:', error);
      }
    };

    calculateTimes();
  }, [settings]);

  return { prayerTimes, jamaatTimes, settings, completed, loading, error };
};
