import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Stack,
  Badge,
  Button,
  IconButton,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';
import { format, subMinutes, isAfter, isBefore, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns';
import { usePrayerTimes } from '../../hooks/usePrayerTimes';
import { useAuth } from '../../hooks/useAuth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import MosqueIcon from '@mui/icons-material/Mosque';
import DoneIcon from '@mui/icons-material/Done';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { saveToStorage } from '../../utils/localStorage';

const PrayerTimesWidget: React.FC = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const isLargeScreen = useMediaQuery(muiTheme.breakpoints.up('md'));
  const isTabletScreen = useMediaQuery(muiTheme.breakpoints.up('sm'));
  const { user } = useAuth();
  const { prayerTimes, jamaatTimes, settings, completed, loading, error } = usePrayerTimes();
  const [remainingTime, setRemainingTime] = useState<{ hours: number, minutes: number } | null>(null);
  const navigate = useNavigate();

  // Calculate time remaining until next prayer
  useEffect(() => {
    if (!jamaatTimes) return;
    
    const currentOrNext = getCurrentOrNextPrayer();
    if (!currentOrNext) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const prayerTime = new Date(currentOrNext.time);
      
      const totalSeconds = Math.max(0, differenceInSeconds(prayerTime, now));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      
      setRemainingTime({ hours, minutes });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [jamaatTimes]);

  const handlePrayerComplete = async (prayer: string) => {
    const newCompletedState = !completed[prayer];
    
    // Update local state immediately
    const newCompleted = { ...completed, [prayer]: newCompletedState };
    
    try {
      const date = new Date().toISOString().split('T')[0];
      
      // Save to local storage
      saveToStorage(`completed_prayers_${date}`, newCompleted);
      
      // If user is logged in and online, update Firestore
      if (user && navigator.onLine) {
        const prayerDocRef = doc(db, `users/${user.uid}/prayers/${date}`);
        await setDoc(prayerDocRef, {
          [prayer + 'Completed']: newCompletedState
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating prayer status:', error);
    }
  };

  // Find current or next prayer
  const getCurrentOrNextPrayer = () => {
    if (!jamaatTimes) return null;
    
    const now = new Date();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    // Check if any prayer time is in the future
    for (const prayer of prayers) {
      if (jamaatTimes[prayer]) {
        const prayerTime = new Date(jamaatTimes[prayer]);
        if (isAfter(prayerTime, now)) {
          return { name: prayer, time: prayerTime, status: 'upcoming' };
        }
      }
    }
    
    // If all prayers have passed, return the next day's Fajr
    if (jamaatTimes['Fajr']) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextFajr = new Date(jamaatTimes['Fajr']);
      nextFajr.setDate(tomorrow.getDate());
      nextFajr.setMonth(tomorrow.getMonth());
      nextFajr.setFullYear(tomorrow.getFullYear());
      return { name: 'Fajr', time: nextFajr, status: 'tomorrow' };
    }
    
    return null;
  };

  const getActiveTimeStatus = (prayer: string, time: string | null) => {
    if (!time) return false;
    
    const now = new Date();
    const prayerTime = new Date(time);
    
    // Buffer times - 15 minutes before to 30 minutes after prayer time
    const beforeBuffer = new Date(prayerTime);
    beforeBuffer.setMinutes(beforeBuffer.getMinutes() - 15);
    
    const afterBuffer = new Date(prayerTime);
    afterBuffer.setMinutes(afterBuffer.getMinutes() + 30);
    
    return isAfter(now, beforeBuffer) && isBefore(now, afterBuffer);
  };

  const isPrayerTimePassed = (time: string | null) => {
    if (!time) return false;
    return isPast(new Date(time));
  };

  const renderPrayerTime = (prayer: string, time: string | null) => {
    const isActive = getActiveTimeStatus(prayer, time);
    const isPrayed = completed[prayer] || false;
    const timePassed = isPrayerTimePassed(time);

    return (
      <Box 
        sx={{ 
          p: 1.5, 
          borderRadius: 'var(--radius-md)',
          bgcolor: isActive 
            ? 'rgba(var(--primary-rgb), 0.1)' 
            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
          border: '1px solid',
          borderColor: isActive 
            ? 'primary.main' 
            : 'divider',
          position: 'relative',
          transition: 'all var(--transition-normal)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--shadow-sm)'
          }
        }}
      >
        <IconButton 
          size="small"
          onClick={() => timePassed && handlePrayerComplete(prayer)}
          disabled={!timePassed}
          sx={{
            position: 'absolute',
            top: 6,
            left: 6,
            opacity: timePassed ? 1 : 0.5,
            color: isPrayed ? 'success.main' : 'text.secondary',
            p: 0.5
          }}
        >
          {isPrayed ? 
            <CheckCircleIcon fontSize="small" color="success" /> : 
            <RadioButtonUncheckedIcon fontSize="small" />
          }
        </IconButton>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            mb: 0.5,
            ml: 4,
            alignSelf: 'flex-start',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.7rem'
          }}
        >
          {prayer}
        </Typography>
        
        <Typography 
          variant="h5" 
          color={isActive ? 'primary.main' : 'text.primary'}
          sx={{ 
            fontWeight: isActive ? 700 : 600,
            letterSpacing: '-0.5px',
            fontSize: { xs: '1.5rem', sm: '1.8rem' },
            lineHeight: 1.1,
            textAlign: 'center',
            py: 1
          }}
        >
          {time ? format(new Date(time), 'hh:mm') : '--:--'}
          <Typography 
            component="span" 
            sx={{ 
              fontSize: '0.9rem',
              ml: 0.5,
              color: isActive ? 'primary.main' : 'text.secondary',
              fontWeight: 500,
              textTransform: 'uppercase'
            }}
          >
            {time ? format(new Date(time), 'a') : ''}
          </Typography>
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress size={40} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          sx={{ 
            borderRadius: 'var(--radius-md)',
            '& .MuiAlert-icon': { 
              alignItems: 'center' 
            }
          }}
        >
          {error}
          {error && error.includes('location') && (
            <Button 
              size="small" 
              color="inherit"
              onClick={() => navigate('/settings')}
              sx={{ mt: 1 }}
            >
              Go to Settings
            </Button>
          )}
        </Alert>
      </Box>
    );
  }

  // Determine grid sizes based on screen size
  const getGridSize = () => {
    if (isLargeScreen) return 4; // 3 blocks in a row on large screens
    if (isTabletScreen) return 4; // 3 blocks in a row on tablets
    return 6; // 2 blocks in a row on mobile
  };

  const tahajjudTime = prayerTimes?.Fajr ? subMinutes(new Date(prayerTimes.Fajr), 30).toISOString() : null;
  const currentOrNext = getCurrentOrNextPrayer();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack 
        direction="row" 
        alignItems="center" 
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <MosqueIcon color="primary" />
          <Typography 
            variant="h6" 
            component="h2"
            sx={{ 
              fontWeight: 600,
              letterSpacing: '-0.5px'
            }}
          >
            Prayer Times
          </Typography>
        </Stack>
        
        <Button
          size="small"
          startIcon={<SettingsIcon />}
          onClick={() => navigate('/settings')}
          variant="outlined"
          sx={{ borderRadius: 'var(--radius-pill)', py: 0.5 }}
        >
          Settings
        </Button>
      </Stack>

      {settings?.location && (
        <Box 
          sx={{ 
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            fontSize: '0.85rem'
          }}
        >
          <LocationOnIcon sx={{ fontSize: '1rem' }} />
          <Typography variant="body2" noWrap>
            {settings.location.city}, {settings.location.country}
          </Typography>
        </Box>
      )}

      {currentOrNext && remainingTime && (
        <Box 
          sx={{ 
            p: 1.5, 
            mb: 2, 
            borderRadius: 'var(--radius-md)', 
            bgcolor: isDark ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(var(--primary-rgb), 0.05)',
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <Stack 
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
            sx={{ width: '100%' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" component="h3" color="primary.main" sx={{ fontWeight: 600 }}>
                Next prayer in {remainingTime.hours.toString().padStart(2, '0')}h:{remainingTime.minutes.toString().padStart(2, '0')}m
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
              <Typography variant="body2" color="text.secondary">
                {currentOrNext.status === 'upcoming' ? 'Next Prayer' : 'Tomorrow\'s Fajr'}
              </Typography>
              <Typography variant="body1" color="primary.main" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {currentOrNext.name}
                <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 1 }}>
                  @: {format(currentOrNext.time, 'hh:mm a')}
                </Typography>
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Grid container spacing={1}>
          <Grid item xs={6} sm={4} md={4}>
            {renderPrayerTime('Tahajjud', tahajjudTime)}
          </Grid>
          {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => (
            <Grid item xs={6} sm={4} md={4} key={prayer}>
              {renderPrayerTime(prayer, jamaatTimes?.[prayer] || null)}
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default PrayerTimesWidget;
