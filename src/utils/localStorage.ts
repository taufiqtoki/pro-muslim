/**
 * A utility file for handling local storage operations
 * This will be used for offline-first approach to store settings
 */

// Key constants for local storage items
export const STORAGE_KEYS = {
  SETTINGS: 'app_settings',
  PRAYER_SETTINGS: 'prayer_settings',
  TASBEEHS: 'tasbeehs',
  THEME: 'theme',
  USER_PREFERENCES: 'user_preferences'
};

/**
 * Save data to local storage with error handling
 */
export const saveToStorage = <T>(key: string, data: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
    return false;
  }
};

/**
 * Get data from local storage with error handling
 */
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error retrieving from localStorage (${key}):`, error);
    return defaultValue;
  }
};

/**
 * Remove item from local storage
 */
export const removeFromStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
};

/**
 * Get default general settings
 */
export const getDefaultSettings = () => {
  return {
    fajr: '',
    dhuhr: '',
    asr: '',
    maghrib: '',
    isha: '',
    tahajjud: '',
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Get default prayer settings
 */
export const getDefaultPrayerSettings = () => {
  return {
    method: 5, // Default to Karachi method
    school: 1, // Default to Hanafi
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
    },
    lastUpdated: new Date().toISOString()
  };
};

// Initialize storage with default values if not already set
export const initializeStorage = () => {
  // Initialize settings if not exist
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    saveToStorage(STORAGE_KEYS.SETTINGS, getDefaultSettings());
  }
  
  // Initialize prayer settings if not exist
  if (!localStorage.getItem(STORAGE_KEYS.PRAYER_SETTINGS)) {
    saveToStorage(STORAGE_KEYS.PRAYER_SETTINGS, getDefaultPrayerSettings());
  }
  
  // Initialize tasbeehs if not exist
  if (!localStorage.getItem(STORAGE_KEYS.TASBEEHS)) {
    saveToStorage(STORAGE_KEYS.TASBEEHS, []);
  }
};

// Call this function when app starts
initializeStorage(); 