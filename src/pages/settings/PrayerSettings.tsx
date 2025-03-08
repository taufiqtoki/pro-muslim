import React, { useState } from 'react';
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
  Button
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { Location, searchLocations } from '../../services/prayerApi.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.ts';
import { useAuth } from '../../hooks/useAuth.ts';

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
  const [method, setMethod] = useState(5); // Default to Karachi method
  const [school, setSchool] = useState(1); // Default to Hanafi
  const [adjustments, setAdjustments] = useState({
    Fajr: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0
  });
  const [jamaatAdjustments, setJamaatAdjustments] = useState({
    Fajr: 20, // Default 20 minutes after Azan
    Dhuhr: 15,
    Asr: 15,
    Maghrib: 5,
    Isha: 15
  });

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

  // Save prayer settings to Firebase
  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/settings/prayer`), {
        method,
        school,
        adjustments,
        jamaatAdjustments,
        location: selectedLocation,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Prayer Settings</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
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
          />
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
          onClick={handleSaveSettings}
          sx={{
            bgcolor: 'grey.700',
            '&:hover': { bgcolor: 'grey.800' }
          }}
        >
          Save Settings
        </Button>
      </Box>
    </Paper>
  );
};
