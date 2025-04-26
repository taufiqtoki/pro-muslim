import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress, 
  Alert,
  FormControl,
  FormControlLabel,
  Switch,
  InputLabel,
  Select,
  MenuItem,
  Paper
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/localStorage';
import { useTheme } from '../../contexts/ThemeContext';

interface GeneralSettingsProps {
  settings: any;
}

// Add type for the settings state
interface AppSettings {
  notifications: {
    enabled: boolean;
    prayerTimes: boolean;
    prayerReminders: boolean;
    reminderTime: number;
  };
  appSettings: {
    autoStartLastTasbeeh: boolean;
    keepScreenOn: boolean;
    enableSounds: boolean;
    language: string;
  };
  [key: string]: any; // Add index signature to allow string indexing
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings: initialSettings }) => {
  const [settings, setSettings] = useState<AppSettings>({
    notifications: {
      enabled: false,
      prayerTimes: true,
      prayerReminders: true,
      reminderTime: 15, // minutes before prayer
    },
    appSettings: {
      autoStartLastTasbeeh: false,
      keepScreenOn: true,
      enableSounds: true,
      language: 'en',
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);
  
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();

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
    // Load settings from local storage first
    const localSettings = getFromStorage(STORAGE_KEYS.USER_PREFERENCES, null);
    
    if (localSettings) {
      setSettings(localSettings);
    } else if (initialSettings && initialSettings.appSettings) {
      setSettings(initialSettings);
      // Save to local storage
      saveToStorage(STORAGE_KEYS.USER_PREFERENCES, initialSettings);
    }
  }, [initialSettings]);

  const handleChange = (section: string, field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSelectChange = (section: string, field: string) => (event: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: event.target.value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Always save to local storage
      saveToStorage(STORAGE_KEYS.USER_PREFERENCES, settings);
      
      // If online and user is logged in, save to Firestore
      if (onlineStatus && user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          preferences: settings,
          lastUpdated: new Date().toISOString()
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
      <Typography variant="h6" gutterBottom>General Settings</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>Theme</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              color="primary"
            />
          }
          label={isDark ? 'Dark Mode' : 'Light Mode'}
        />
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>Notifications</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications.enabled}
              onChange={handleChange('notifications', 'enabled')}
              color="primary"
            />
          }
          label="Enable Notifications"
        />
        
        <Box sx={{ ml: 3, mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications.prayerTimes}
                onChange={handleChange('notifications', 'prayerTimes')}
                color="primary"
                disabled={!settings.notifications.enabled}
              />
            }
            label="Prayer Time Notifications"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications.prayerReminders}
                onChange={handleChange('notifications', 'prayerReminders')}
                color="primary"
                disabled={!settings.notifications.enabled}
              />
            }
            label="Prayer Reminders"
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" sx={{ mr: 2 }}>Reminder Time:</Typography>
            <FormControl size="small" sx={{ width: 100 }}>
              <Select
                value={settings.notifications.reminderTime}
                onChange={handleSelectChange('notifications', 'reminderTime')}
                disabled={!settings.notifications.enabled || !settings.notifications.prayerReminders}
              >
                <MenuItem value={5}>5 min</MenuItem>
                <MenuItem value={10}>10 min</MenuItem>
                <MenuItem value={15}>15 min</MenuItem>
                <MenuItem value={20}>20 min</MenuItem>
                <MenuItem value={30}>30 min</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ ml: 1 }}>before prayer</Typography>
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>App Settings</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={settings.appSettings.autoStartLastTasbeeh}
              onChange={handleChange('appSettings', 'autoStartLastTasbeeh')}
              color="primary"
            />
          }
          label="Auto-start Last Used Tasbeeh"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.appSettings.keepScreenOn}
              onChange={handleChange('appSettings', 'keepScreenOn')}
              color="primary"
            />
          }
          label="Keep Screen On During Tasbeeh/Prayer"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.appSettings.enableSounds}
              onChange={handleChange('appSettings', 'enableSounds')}
              color="primary"
            />
          }
          label="Enable Sounds"
        />
        
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Language</InputLabel>
            <Select
              value={settings.appSettings.language}
              label="Language"
              onChange={handleSelectChange('appSettings', 'language')}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="ar">Arabic</MenuItem>
              <MenuItem value="bn">Bengali</MenuItem>
              <MenuItem value="ur">Urdu</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Button
        variant="contained"
        color="primary"
        startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </Button>
    </Paper>
  );
};

export default GeneralSettings; 