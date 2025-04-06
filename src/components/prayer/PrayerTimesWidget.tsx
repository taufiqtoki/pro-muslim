import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Stack,
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
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  // Initialize localCompleted with the value from usePrayerTimes hook
  useEffect(() => {
    if (completed) {
      setLocalCompleted(completed);
    }
  }, [completed]);

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
    const newCompletedState = !localCompleted[prayer];
    
    // Update local state immediately for instant UI feedback
    setLocalCompleted(prev => ({ ...prev, [prayer]: newCompletedState }));
    
    try {
      const date = new Date().toISOString().split('T')[0];
      
      // Save to local storage
      saveToStorage(`completed_prayers_${date}`, {...localCompleted, [prayer]: newCompletedState});
      
      // If user is logged in and online, update Firestore
      if (user && navigator.onLine) {
        const prayerDocRef = doc(db, `users/${user.uid}/prayers/${date}`);
        await setDoc(prayerDocRef, {
          [prayer + 'Completed']: newCompletedState
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating prayer status:', error);
      // Revert local state on error
      setLocalCompleted(prev => ({ ...prev, [prayer]: !newCompletedState }));
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
    const isPrayed = localCompleted[prayer] || false;
    const timePassed = isPrayerTimePassed(time);

    return (
      <Box 
        sx={{ 
          p: { xs: 0.75, sm: 0.75 }, 
          borderRadius: 'var(--radius-md)',
          bgcolor: isActive 
            ? 'rgba(var(--primary-rgb), 0.1)' 
            : 'transparent',
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
            top: 4,
            right: 4,
            opacity: timePassed ? 1 : 0.5,
            color: isPrayed ? 'success.main' : 'text.secondary',
            p: 0.25
          }}
        >
          {isPrayed ? 
            <CheckCircleIcon sx={{ fontSize: '0.85rem' }} color="success" /> : 
            <RadioButtonUncheckedIcon sx={{ fontSize: '0.85rem' }} />
          }
        </IconButton>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            mb: 0,
            ml: 1.5,
            alignSelf: 'flex-start',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.65rem'
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
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            lineHeight: 1,
            textAlign: 'center',
            py: 0.5
          }}
        >
          {time ? format(new Date(time), 'hh:mm') : '--:--'}
          <Typography 
            component="span" 
            sx={{ 
              fontSize: '0.7rem',
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

  const tahajjudTime = prayerTimes?.Fajr ? subMinutes(new Date(prayerTimes.Fajr), 30).toISOString() : null;
  const currentOrNext = getCurrentOrNextPrayer();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack 
        direction="row" 
        alignItems="center" 
        justifyContent="space-between"
        sx={{ mb: 0.5 }}
      >
        <Typography 
          variant="subtitle2" 
          component="h2"
          sx={{ 
            fontWeight: 600,
            letterSpacing: '-0.5px'
          }}
        >
          Prayer Times
        </Typography>
        
        <IconButton
          onClick={() => navigate('/settings', { state: { defaultTab: 1 } })}
          size="small"
          sx={{ 
            color: 'primary.main',
            bgcolor: isDark ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(var(--primary-rgb), 0.05)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(var(--primary-rgb), 0.1)'
            },
            width: 20,
            height: 20
          }}
        >
          <SettingsIcon sx={{ fontSize: '0.85rem' }} />
        </IconButton>
      </Stack>

      {settings?.location && (
        <Box 
          sx={{ 
            mb: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            fontSize: '0.75rem'
          }}
        >
          <LocationOnIcon sx={{ fontSize: '0.85rem' }} />
          <Typography variant="caption" noWrap>
            {settings.location.city}, {settings.location.country}
          </Typography>
        </Box>
      )}

      {currentOrNext && remainingTime && (
        <Box 
          sx={{ 
            p: 1, 
            mb: 1, 
            borderRadius: 'var(--radius-md)', 
            bgcolor: 'transparent',
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Typography 
              variant="body2" 
              color="primary.main" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '0.75rem', sm: '0.85rem' } 
              }}
            >
              Be Ready for  <Box component="span" sx={{ fontSize: { xs: '1.25rem', sm: '1.25rem' }, fontWeight: 500 }}>{currentOrNext.name}</Box>  in  <Box component="span" sx={{ fontSize: { xs: '1.25rem', sm: '1.25rem' }, fontWeight: 500 }}>{remainingTime.hours}h {remainingTime.minutes}m</Box>
            </Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Grid container spacing={0.5}>
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
