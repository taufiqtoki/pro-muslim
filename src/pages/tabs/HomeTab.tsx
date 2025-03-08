import React from 'react';
import { Box, Container, CircularProgress, Alert, Grid } from '@mui/material';
import Stopwatch from '../../components/Stopwatch.tsx';
import PrayerTimesWidget from '../../components/prayer/PrayerTimesWidget.tsx';
import ClockWidget from '../../components/ClockWidget.tsx';
import SleepTracker from '../../components/tracking/SleepTracker.tsx';
import TasbeehTracker from '../../components/TasbeehTracker.tsx';
import { useTasbeehs } from '../../hooks/useTasbeehs.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const HomeTab: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { tasbeehs, loading: tasbeehsLoading, error } = useTasbeehs();
  const { isDark } = useTheme();

  if (authLoading || tasbeehsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box p={3}>
        <Alert severity="info">Please sign in to use the Tasbeeh tracker</Alert>
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
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: isDark ? 'none' : 'linear-gradient(to bottom right, #eff6ff, #eef2ff)',
        py: 4,
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="lg" sx={{ mx: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ClockWidget />
          <PrayerTimesWidget />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Stopwatch />
            </Grid>
            <Grid item xs={12} md={6}>
              <TasbeehTracker tasbeehs={tasbeehs} />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <SleepTracker />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default HomeTab;
