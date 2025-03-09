// Keys that should be preserved during clear
const PRESERVED_KEYS = ['theme'];

export const clearAppStorage = async () => {
  try {
    // 1. Get values we want to preserve
    const preserved = PRESERVED_KEYS.reduce((acc, key) => {
      acc[key] = localStorage.getItem(key);
      return acc;
    }, {} as Record<string, string | null>);

    // 2. Clear all storage types
    localStorage.clear();
    sessionStorage.clear();
    
    // 3. Clear IndexedDB databases
    const databases = await window.indexedDB.databases();
    databases.forEach(db => {
      if (db.name) window.indexedDB.deleteDatabase(db.name);
    });

    // 4. Clear all caches
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(key => caches.delete(key)));
    }

    // 5. Clear cookies (except essential ones)
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (!PRESERVED_KEYS.includes(name)) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      }
    });

    // 6. Clear service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }

    // 7. Restore preserved values
    Object.entries(preserved).forEach(([key, value]) => {
      if (value) localStorage.setItem(key, value);
    });

    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
};

// Utility to check storage size (helpful for debugging)
export const getStorageInfo = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage, // Used space in bytes
      quota: estimate.quota, // Available space in bytes
      percent: estimate.usage ? Math.round((estimate.usage / estimate.quota!) * 100) : 0
    };
  }
  return null;
};
