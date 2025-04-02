import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Autocomplete,
  Alert,
  Button,
  Snackbar,
  CircularProgress,
  Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { Location, searchLocations, getUserLocation, reverseGeocode } from '../../services/prayerApi.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth.ts';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/localStorage';

// Define prayer settings type
interface PrayerSettingsType {
  method: number;
  school: number;
  adjustments: {
    [key: string]: number;
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  };
  jamaatAdjustments: {
    [key: string]: number;
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  };
  location: Location;
  lastUpdated?: string;
}

const CALCULATION_METHODS = [
  { id: 1, name: 'Egyptian General Authority of Survey' },
  { id: 2, name: 'Islamic Society of North America (ISNA)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm Al-Qura University, Makkah' },
  { id: 5, name: 'University of Islamic Sciences, Karachi' }
];

export const PrayerSettings = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState(5); // Default to Karachi method
  const [school, setSchool] = useState(1); // Default to Hanafi
  const [adjustments, setAdjustments] = useState<{
    [key: string]: number;
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  }>({
    Fajr: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0
  });
  const [jamaatAdjustments, setJamaatAdjustments] = useState<{
    [key: string]: number;
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  }>({
    Fajr: 20, // Default 20 minutes after Azan
    Dhuhr: 15,
    Asr: 15,
    Maghrib: 5,
    Isha: 15
  });
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);

  const debouncedSearch = useDebounce(searchQuery, 500);

  React.useEffect(() => {
    const fetchLocations = async () => {
      if (!debouncedSearch) return;
      setLoading(true);
      try {
        const results = await searchLocations(debouncedSearch);
        setLocations(results);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [debouncedSearch]);

  // Set default location
  React.useEffect(() => {
    if (!selectedLocation && !loading) {
      setSelectedLocation({
        city: 'Chittagong Division',
        country: 'Bangladesh',
        latitude: 22.356851,
        longitude: 91.783182
      });
    }
  }, []);

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Try to load from local storage first for immediate display
        const localSettings = getFromStorage<PrayerSettingsType | null>(STORAGE_KEYS.PRAYER_SETTINGS, null);
        
        if (localSettings) {
          setAdjustments(localSettings.adjustments);
          setJamaatAdjustments(localSettings.jamaatAdjustments);
          setMethod(localSettings.method);
          setSchool(localSettings.school);
          setSelectedLocation(localSettings.location);
        }
        
        // If online, try to fetch from Firestore and update local
        if (onlineStatus && auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists() && userDoc.data().prayerSettings) {
            const serverSettings = userDoc.data().prayerSettings;
            setAdjustments(serverSettings.adjustments);
            setJamaatAdjustments(serverSettings.jamaatAdjustments);
            setMethod(serverSettings.method);
            setSchool(serverSettings.school);
            setSelectedLocation(serverSettings.location);
            
            // Update local storage with server data
            saveToStorage(STORAGE_KEYS.PRAYER_SETTINGS, serverSettings);
          } else if (localSettings) {
            // If no server data but we have local data, sync it to server
            await updateDoc(userRef, { prayerSettings: localSettings });
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        if (!onlineStatus) {
          setError('You are currently offline. Settings loaded from local storage.');
        } else {
          setError('Failed to load settings from server. Using local settings if available.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [onlineStatus]);

  const handleDetectLocation = async () => {
    setLocationLoading(true);
    setError(null);
    
    try {
      // Get geolocation from browser
      const position = await getUserLocation();
      const { latitude, longitude } = position.coords;
      
      // Get location name from coordinates
      const locationData = await reverseGeocode(latitude, longitude);
      
      // Update the selected location
      setSelectedLocation(locationData);
      setSuccess('Location detected successfully');
    } catch (error) {
      console.error('Error detecting location:', error);
      if ((error as GeolocationPositionError)?.code === 1) {
        // Permission denied
        setError('Location permission denied. Please enable location access in your browser settings for accurate prayer times.');
      } else {
        // Other errors
        setError('Unable to detect your location. Please search for your city manually.');
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedLocation) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Always save to local storage first
      saveToStorage(STORAGE_KEYS.PRAYER_SETTINGS, {
        method,
        school,
        adjustments,
        jamaatAdjustments,
        location: selectedLocation,
        lastUpdated: new Date().toISOString()
      });
      
      // If online, save to Firestore
      if (onlineStatus && auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          prayerSettings: {
            method,
            school,
            adjustments,
            jamaatAdjustments,
            location: selectedLocation,
            lastUpdated: new Date().toISOString()
          }
        });
      }
      
      setSuccess('Settings saved successfully' + (!onlineStatus ? ' (offline mode)' : ''));
    } catch (error) {
      console.error('Error saving settings:', error);
      if (!onlineStatus) {
        setError('You are offline. Settings saved locally and will sync when online.');
      } else {
        setError('Failed to save settings to server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Prayer Settings</Typography>
      
      {success && (
        <Alert severity="success" sx={{ my: 2 }}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Autocomplete
              options={locations}
              loading={loading}
              getOptionLabel={(option) => `${option.city}, ${option.country}`}
              value={selectedLocation}
              onChange={(_, newValue) => setSelectedLocation(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Location"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                />
              )}
              sx={{ flexGrow: 1 }}
            />
            <Button 
              variant="outlined"
              onClick={handleDetectLocation}
              startIcon={<MyLocationIcon />}
              disabled={locationLoading}
              sx={{ minWidth: '120px', height: '56px' }}
            >
              {locationLoading ? <CircularProgress size={24} /> : "Detect"}
            </Button>
          </Box>
          {selectedLocation && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Typography>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Calculation Method</InputLabel>
            <Select
              value={method}
              onChange={(e) => setMethod(Number(e.target.value))}
              label="Calculation Method"
            >
              {CALCULATION_METHODS.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>School</InputLabel>
            <Select
              value={school}
              onChange={(e) => setSchool(Number(e.target.value))}
              label="School"
            >
              <MenuItem value={0}>Shafi</MenuItem>
              <MenuItem value={1}>Hanafi</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Prayer Time Adjustments (minutes)
          </Typography>
          <Grid container spacing={2}>
            {Object.keys(adjustments).map((prayer) => (
              <Grid item xs={12} sm={4} key={prayer}>
                <TextField
                  label={prayer}
                  type="number"
                  fullWidth
                  value={adjustments[prayer]}
                  onChange={(e) => setAdjustments(prev => ({
                    ...prev,
                    [prayer]: parseInt(e.target.value) || 0
                  }))}
                  inputProps={{ min: -60, max: 60 }}
                  helperText="- for earlier, + for later"
                />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Jamaat Time Adjustments (minutes after Azan)
          </Typography>
          <Grid container spacing={2}>
            {Object.keys(jamaatAdjustments).map((prayer) => (
              <Grid item xs={12} sm={4} key={`jamaat-${prayer}`}>
                <TextField
                  label={`${prayer} Jamaat`}
                  type="number"
                  fullWidth
                  value={jamaatAdjustments[prayer]}
                  onChange={(e) => setJamaatAdjustments(prev => ({
                    ...prev,
                    [prayer]: parseInt(e.target.value) || 0
                  }))}
                  inputProps={{ min: 0, max: 120 }}
                  helperText="Minutes after Azan"
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      {!selectedLocation && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Please select your location to get accurate prayer times
        </Alert>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{
            bgcolor: 'grey.700',
            '&:hover': { bgcolor: 'grey.800' }
          }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Settings'}
        </Button>
      </Box>

      {/* Offline indicator */}
      {!onlineStatus && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          You are currently offline. Changes will be saved locally and synced when you&apos;re back online.
        </Alert>
      )}
    </Paper>
  );
};
