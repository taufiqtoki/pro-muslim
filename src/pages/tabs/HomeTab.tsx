import React from 'react';
import { Box, Container, Grid } from '@mui/material';
import Stopwatch from '../../components/Stopwatch.tsx';
import PrayerTimesWidget from '../../components/prayer/PrayerTimesWidget.tsx';
import ClockWidget from '../../components/ClockWidget.tsx';
import SleepTracker from '../../components/tracking/SleepTracker.tsx';
import TasbeehTracker from '../../components/TasbeehTracker.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const HomeTab: React.FC = () => {
  const { isDark } = useTheme();

  // Add initial tasbeehs array
  const initialTasbeehs = [
    // Add your initial tasbeehs here if needed, or leave as empty array
  ];

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
            <Grid item xs={12}>
              <Stopwatch />
            </Grid>
            <Grid item xs={12} md={6}>
              <TasbeehTracker tasbeehs={initialTasbeehs} />
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
