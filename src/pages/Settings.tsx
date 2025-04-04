import React, { useState, useEffect, ReactNode } from 'react';
import { Container, Typography, IconButton, Tabs, Tab, Box, Divider, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useLocation } from 'react-router-dom';
import TasbeehSettings from '../components/settings/TasbeehSettings.tsx';
import { PrayerSettings } from './settings/PrayerSettings.tsx';
import { db } from '../firebase.ts';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth.ts';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import { hardReload } from '../utils/reload.ts';
import { clearAppStorage } from '../utils/storage.ts';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/localStorage';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [value, setValue] = useState(() => {
    // Check if there's a defaultTab in location state and use it, otherwise default to 0
    return location.state && typeof location.state.defaultTab === 'number' 
      ? location.state.defaultTab 
      : 0;
  });
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);

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
      setError(null);
      
      try {
        // Try to load from local storage first for immediate display
        const localSettings = getFromStorage(STORAGE_KEYS.SETTINGS, null);
        
        if (localSettings) {
          setSettings(localSettings);
        }
        
        // If online, try to fetch from Firestore and update local
        if (onlineStatus && user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists() && userDoc.data().settings) {
            const serverSettings = userDoc.data().settings;
            setSettings(serverSettings);
            
            // Update local storage with server data
            saveToStorage(STORAGE_KEYS.SETTINGS, serverSettings);
          } else if (localSettings) {
            // If no server data but we have local data, sync it to server
            await setDoc(doc(db, 'users', user.uid), { 
              settings: localSettings 
            }, { merge: true });
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
  }, [user, onlineStatus]);

  const handleSave = async () => {
    if (!user || !settings) return;

    try {
      await updateDoc(doc(db, `users/${user.uid}/settings/default`), settings);
      setSuccess('Settings saved successfully');
    } catch (error) {
      setError('Failed to save settings');
    }
  };

  const handleClearSiteData = async () => {
    try {
      // Clear app storage but preserve theme
      clearAppStorage();
      
      // Clear caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }
      setSuccess('Site data cleared successfully');
      setTimeout(() => {
        hardReload();
      }, 1500);
    } catch (error) {
      setError('Failed to clear site data');
    }
    setClearDataModalOpen(false);
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleClearDataDialog = async () => {
    if (typeof window !== 'undefined') {
      try {
        // Clear local storage but keep important user data
        const theme = localStorage.getItem(STORAGE_KEYS.THEME);
        const userPrefs = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
        
        localStorage.clear();
        
        // Restore important user data
        if (theme) localStorage.setItem(STORAGE_KEYS.THEME, theme);
        if (userPrefs) localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, userPrefs);
        
        setSuccess('Local data cleared successfully');
      } catch (error) {
        console.error('Error clearing data:', error);
        setError('Failed to clear local data');
      }
      
      setOpenDialog(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <IconButton onClick={() => navigate('/')}> 
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Settings
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label="Tasbeehs" />
          <Tab label="Prayer Times" />
          <Tab label="General" />
        </Tabs>
      </Box>

      {/* Offline indicator */}
      {!onlineStatus && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are currently offline. Changes will be saved locally and synced when you&apos;re back online.
        </Alert>
      )}

      <TabPanel value={value} index={0}>
        <TasbeehSettings />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <PrayerSettings />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>General Settings</Typography>
          
          {success && (
            <Box mt={2} mb={2}>
              <Alert severity="success">{success}</Alert>
            </Box>
          )}
          
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" color="error" gutterBottom>
            Danger Zone
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setOpenDialog(true)}
            sx={{ mt: 2 }}
          >
            Clear Site Data
          </Button>
        </Box>
      </TabPanel>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Clear All Site Data?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This will clear all locally stored data including your saved settings and cached information.
            Your account and online data will not be affected. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleClearDataDialog} autoFocus color="error">
            Clear Data
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
