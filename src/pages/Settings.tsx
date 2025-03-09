import React, { useState, useEffect } from 'react';
import { Container, Typography, IconButton, Tabs, Tab, Box, Divider, TextField, Button, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { TasbeehSettings } from '../components/settings/TasbeehSettings.tsx';
import { PrayerSettings } from './settings/PrayerSettings.tsx';
import { db } from '../firebase.ts';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth.ts';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import { hardReload } from '../utils/reload.ts';
import { clearAppStorage } from '../utils/storage.ts';

interface TabPanelProps {
  children?: React.ReactNode;
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
  const { user } = useAuth();
  const [value, setValue] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, `users/${user.uid}/settings/default`));
        setSettings(settingsDoc.data());
      } catch (error) {
        setError('Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

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
        <Tabs value={value} onChange={(_, newValue) => setValue(newValue)}>
          <Tab label="Tasbeehs" />
          <Tab label="Prayer Times" />
          <Tab label="General" />
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        <TasbeehSettings />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <PrayerSettings />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>Settings</Typography>
          <TextField
            label="Fajr Jamaat Time"
            type="time"
            value={settings?.fajr || ''}
            onChange={(e) => setSettings({ ...settings, fajr: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Dhuhr Jamaat Time"
            type="time"
            value={settings?.dhuhr || ''}
            onChange={(e) => setSettings({ ...settings, dhuhr: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Asr Jamaat Time"
            type="time"
            value={settings?.asr || ''}
            onChange={(e) => setSettings({ ...settings, asr: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Maghrib Jamaat Time"
            type="time"
            value={settings?.maghrib || ''}
            onChange={(e) => setSettings({ ...settings, maghrib: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Isha Jamaat Time"
            type="time"
            value={settings?.isha || ''}
            onChange={(e) => setSettings({ ...settings, isha: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Tahajjud Time"
            type="time"
            value={settings?.tahajjud || ''}
            onChange={(e) => setSettings({ ...settings, tahajjud: e.target.value })}
            fullWidth
            margin="normal"
          />
          <Button variant="contained" color="primary" onClick={handleSave} sx={{ mt: 2 }}>
            Save
          </Button>
          {success && (
            <Box mt={2}>
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
            onClick={() => setClearDataModalOpen(true)}
            sx={{ mt: 2 }}
          >
            Clear Site Data & Cache
          </Button>
        </Box>
      </TabPanel>

      <ConfirmationModal
        open={clearDataModalOpen}
        onClose={() => setClearDataModalOpen(false)}
        onConfirm={handleClearSiteData}
        title="Clear Site Data"
        message="This will clear all locally stored data and cache. The app will return to its initial state. This action cannot be undone."
        confirmText="Clear Data"
      />
    </Container>
  );
};

export default Settings;
