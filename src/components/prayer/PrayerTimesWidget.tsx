import React from 'react';
import { Paper, Typography, Box, Grid, Checkbox, Tooltip, CircularProgress, Alert } from '@mui/material';
import { format, subMinutes } from 'date-fns';
import { usePrayerTimes } from '../../hooks/usePrayerTimes.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.ts';

const prayerTimesGridStyle = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  p: 2,
  textAlign: 'center'
};

const PrayerTimesWidget: React.FC = () => {
  const { user } = useAuth();
  const { prayerTimes, jamaatTimes, settings, completed, loading, error } = usePrayerTimes();

  const handlePrayerComplete = async (prayer: string) => {
    if (!user) return;
    try {
      const date = new Date().toISOString().split('T')[0];
      await updateDoc(doc(db, `users/${user.uid}/prayers/${date}`), {
        [`${prayer}Completed`]: !completed[prayer]
      });
    } catch (error) {
      console.error('Error updating prayer status:', error);
    }
  };

  const renderPrayerTime = (prayer: string, time: Date | null) => {
    return (
      <Box sx={prayerTimesGridStyle}>
        <Typography variant="h6">{prayer}</Typography>
        <Tooltip title="Jamaat Time">
          <Typography variant="h5" color="primary">
            {time ? format(time, 'hh:mm a') : '--:--'}
          </Typography>
        </Tooltip>
        <Checkbox
          checked={completed[prayer] || false}
          onChange={() => handlePrayerComplete(prayer)}
          color="success"
        />
      </Box>
    );
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

  const tahajjudTime = prayerTimes?.Fajr ? subMinutes(new Date(prayerTimes.Fajr), 30) : null;

  return (
    <Box>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2} lg={2} xl={2}>
            {renderPrayerTime('Tahajjud', tahajjudTime)}
          </Grid>
          {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => (
            <Grid item xs={6} sm={4} md={2} lg={2} xl={2} key={prayer}>
              {renderPrayerTime(prayer, jamaatTimes?.[prayer] ? new Date(jamaatTimes[prayer]) : null)}
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default PrayerTimesWidget;
