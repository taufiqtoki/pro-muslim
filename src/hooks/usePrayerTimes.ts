import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { PrayerSettings, getPrayerTimes, getUserLocation, reverseGeocode } from '../services/prayerApi';
import { doc, getDoc, setDoc, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '../firebase';
import { addMinutes, subMinutes } from 'date-fns';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/localStorage';

// Default prayer settings
const DEFAULT_SETTINGS: PrayerSettings = {
  method: 5, // University of Islamic Sciences, Karachi
  school: 1, // Hanafi
  adjustments: {
    Fajr: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0
  },
  jamaatAdjustments: {
    Fajr: 20,
    Dhuhr: 15,
    Asr: 15,
    Maghrib: 5,
    Isha: 15
  },
  location: {
    city: 'Chittagong Division',
    country: 'Bangladesh',
    latitude: 22.356851,
    longitude: 91.783182
  }
};

export const usePrayerTimes = () => {
  const { user } = useAuth();
  const [prayerTimes, setPrayerTimes] = useState<{[key: string]: string} | null>(null);
  const [jamaatTimes, setJamaatTimes] = useState<{[key: string]: string} | null>(null);
  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [completed, setCompleted] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState<boolean>(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect user location
  const detectUserLocation = async (): Promise<PrayerSettings> => {
    try {
      // Try to get user's geolocation
      const position = await getUserLocation();
      const { latitude, longitude } = position.coords;
      
      // Get location details from coordinates
      const locationData = await reverseGeocode(latitude, longitude);
      
      // Create settings with detected location
      return {
        ...DEFAULT_SETTINGS,
        location: locationData
      };
    } catch (error) {
      console.error('Location detection error:', error);
      // Return default settings if location detection fails
      return DEFAULT_SETTINGS;
    }
  };

  // Load settings and prayer times
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if we have settings in local storage
        const localSettings = getFromStorage<PrayerSettings | null>(STORAGE_KEYS.PRAYER_SETTINGS, null);
        
        if (localSettings) {
          // Use local settings immediately
          setSettings(localSettings);
          setLoading(false);
        }
        
        // If user is logged in and online, try to get settings from Firebase
        if (user && onlineStatus) {
          try {
            unsubscribe = onSnapshot(
              doc(db, `users/${user.uid}`), 
              async (docSnapshot) => {
                if (docSnapshot.exists() && docSnapshot.data().prayerSettings) {
                  // Save server settings to state and local storage
                  const serverSettings = docSnapshot.data().prayerSettings as PrayerSettings;
                  setSettings(serverSettings);
                  saveToStorage(STORAGE_KEYS.PRAYER_SETTINGS, serverSettings);
                } else if (!localSettings) {
                  // If no settings exist anywhere, detect location
                  if (!locationPermissionRequested) {
                    setLocationPermissionRequested(true);
                    const detectedSettings = await detectUserLocation();
                    
                    // Save detected settings
                    setSettings(detectedSettings);
                    saveToStorage(STORAGE_KEYS.PRAYER_SETTINGS, detectedSettings);
                    
                    // Save to Firestore if online
                    if (onlineStatus) {
                      try {
                        await setDoc(doc(db, `users/${user.uid}`), {
                          prayerSettings: detectedSettings
                        }, { merge: true });
                      } catch (err) {
                        console.error('Error saving detected settings to Firestore:', err);
                      }
                    }
                  }
                }
                setLoading(false);
              }, 
              (error: FirestoreError) => {
                console.error('Firestore error:', error);
                if (localSettings) {
                  // Still use local settings if available
                  setSettings(localSettings);
                } else {
                  setError('Failed to load prayer settings. Please check your connection.');
                }
                setLoading(false);
              }
            );
          } catch (firestoreError) {
            console.error('Error setting up Firestore listener:', firestoreError);
            if (localSettings) {
              // Still use local settings if available
              setSettings(localSettings);
            } else {
              // Last resort - try to detect location
              try {
                const detectedSettings = await detectUserLocation();
                setSettings(detectedSettings);
                saveToStorage(STORAGE_KEYS.PRAYER_SETTINGS, detectedSettings);
              } catch (locError) {
                setError('Failed to get prayer settings. Please check app settings.');
              }
            }
            setLoading(false);
          }
        } else if (!localSettings && !onlineStatus) {
          // Offline with no local settings - try to detect location
          try {
            const detectedSettings = await detectUserLocation();
            setSettings(detectedSettings);
            saveToStorage(STORAGE_KEYS.PRAYER_SETTINGS, detectedSettings);
          } catch (err) {
            setError('Unable to detect location while offline. Please check your settings.');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in loadSettings:', err);
        setError('An error occurred while setting up prayer times. Please refresh the page.');
        setLoading(false);
      }
    };
    
    loadSettings();
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, onlineStatus, locationPermissionRequested]);

  // Calculate prayer times when settings change
  useEffect(() => {
    if (!settings) return;

    const calculateTimes = async () => {
      try {
        setError(null);
        const times = await getPrayerTimes(settings, new Date());
        setPrayerTimes(times);

        // Calculate Jamaat times
        const jamaat: {[key: string]: string} = {};
        Object.keys(times).forEach(prayer => {
          if (times[prayer] && settings.jamaatAdjustments[prayer] !== undefined) {
            const azanTime = new Date(times[prayer]);
            const jamaatTime = addMinutes(azanTime, settings.jamaatAdjustments[prayer]);
            jamaat[prayer] = jamaatTime.toISOString();
          }
        });

        setJamaatTimes(jamaat);
      } catch (err) {
        console.error('Error calculating prayer times:', err);
        
        // Try to use cached prayer times if available
        const cachedTimes = getFromStorage<{[key: string]: string} | null>(`prayer_times_${new Date().toISOString().split('T')[0]}`, null);
        if (cachedTimes) {
          setPrayerTimes(cachedTimes);
          
          // Calculate jamaat times from cached times
          const jamaat: {[key: string]: string} = {};
          Object.keys(cachedTimes).forEach(prayer => {
            if (cachedTimes[prayer] && settings.jamaatAdjustments[prayer] !== undefined) {
              const azanTime = new Date(cachedTimes[prayer]);
              const jamaatTime = addMinutes(azanTime, settings.jamaatAdjustments[prayer]);
              jamaat[prayer] = jamaatTime.toISOString();
            }
          });
          
          setJamaatTimes(jamaat);
        } else {
          setError('Failed to fetch prayer times. Please check your internet connection.');
        }
      }
    };

    calculateTimes();
  }, [settings]);

  // Load completed prayers
  useEffect(() => {
    if (!user || !onlineStatus) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const unsubCompleted = onSnapshot(
        doc(db, `users/${user.uid}/prayers/${today}`), 
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            setCompleted(docSnapshot.data() as {[key: string]: boolean});
          } else {
            setCompleted({});
          }
        }, 
        (err) => {
          console.error('Error fetching completed prayers:', err);
          // Use local completed prayers if available
          const localCompleted = getFromStorage<{[key: string]: boolean} | null>(
            `completed_prayers_${today}`, 
            null
          );
          if (localCompleted) {
            setCompleted(localCompleted);
          }
        }
      );

      return () => unsubCompleted();
    } catch (error) {
      console.error('Error setting up completed prayers listener:', error);
      // Try to use local storage as fallback
      const today = new Date().toISOString().split('T')[0];
      const localCompleted = getFromStorage<{[key: string]: boolean} | null>(
        `completed_prayers_${today}`, 
        null
      );
      if (localCompleted) {
        setCompleted(localCompleted);
      }
    }
  }, [user, onlineStatus]);

  return { prayerTimes, jamaatTimes, settings, completed, loading, error };
};
