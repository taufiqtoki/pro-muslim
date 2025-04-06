import React, { useState, useEffect } from "react";
import { Typography, Box, Stack, Divider } from "@mui/material";
import { differenceInHours, differenceInMinutes, format } from 'date-fns';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import { useTheme } from '../contexts/ThemeContext';
import { useRoutine, Routine } from '../hooks/useRoutine';

const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { isDark } = useTheme();
  const { routines } = useRoutine();
  
  // Find night sleep time from routine, or use default 10:30PM
  const getNightSleepTime = () => {
    const defaultBedTime = new Date();
    defaultBedTime.setHours(22, 30, 0, 0); // Default is 10:30 PM
    
    if (!routines || !Array.isArray(routines) || routines.length === 0) {
      return defaultBedTime;
    }

    // Find night sleep time from routines
    const nightSleepRoutine = routines.find(
      (routine: Routine) => 
        routine && 
        (routine.type === 'sleep' || 
         (routine.title && routine.title.toLowerCase().includes('night')) || 
         (routine.title && routine.title.toLowerCase().includes('sleep')))
    );

    if (nightSleepRoutine && nightSleepRoutine.time) {
      try {
        const [hours, minutes] = nightSleepRoutine.time.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const bedTime = new Date();
          bedTime.setHours(hours, minutes, 0, 0);
          return bedTime;
        }
      } catch (error) {
        console.error('Error parsing routine time:', error);
      }
    }

    return defaultBedTime;
  };

  const bedTime = getNightSleepTime();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = () => {
    try {
      const now = new Date();
      const sleepTime = getNightSleepTime();
      
      if (now > sleepTime) {
        sleepTime.setDate(sleepTime.getDate() + 1);
      }
      
      const hoursLeft = differenceInHours(sleepTime, now);
      const minutesLeft = differenceInMinutes(sleepTime, now) % 60;
      
      return `${hoursLeft}h ${minutesLeft}m`;
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return '0h 0m';
    }
  };

  const formatBedTimeDisplay = () => {
    try {
      return format(bedTime, 'hh:mm a');
    } catch (error) {
      console.error('Error formatting bed time:', error);
      return '10:30 PM';
    }
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: "center",
      alignItems: "center",
      pt: 1.5
    }}>
      {/* Current Time (70%) */}
      <Box sx={{ flexBasis: '70%', textAlign: 'center', pr: 2 }}>
        <Typography 
          variant="h2" 
          sx={{ 
            fontWeight: 700,
            fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
            letterSpacing: '-1px',
            color: 'text.primary',
            fontFamily: 'var(--font-display)',
            lineHeight: 1.1
          }}
        >
          {format(time, 'hh:mm')}
          <Typography 
            component="span" 
            sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 500,
              ml: 1,
              color: 'text.secondary',
              verticalAlign: 'middle'
            }}
          >
            {format(time, 'ss')}
          </Typography>
          <Typography 
            component="span" 
            sx={{ 
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
              fontWeight: 500,
              ml: 0.5,
              color: 'text.secondary',
              textTransform: 'uppercase',
              verticalAlign: 'super'
            }}
          >
            {format(time, 'a')}
          </Typography>
        </Typography>
      
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.secondary',
            fontSize: { xs: '0.9rem', sm: '1rem' },
            fontWeight: 500
          }}
        >
          {format(time, 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>
      
      {/* Divider */}
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Bedtime Remaining (30%) */}
      <Box 
        sx={{ 
          flexBasis: '30%',
          textAlign: 'center',
          p: 1,
          borderRadius: 'var(--radius-md)',
          bgcolor: 'transparent'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
          <NightsStayIcon fontSize="small" color="inherit" sx={{ color: 'text.secondary' }} />
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
          >
            Remaining
          </Typography>
        </Box>
        
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1.2rem', sm: '1.5rem' },
            color: 'text.primary',
            lineHeight: 1.1
          }}
        >
          {getTimeRemaining()}
        </Typography>
        
        <Typography 
          variant="caption" 
          color="grey"
          sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
        >
          {formatBedTimeDisplay()}
        </Typography>
      </Box>
    </Box>
  );
};

export default ClockWidget;
