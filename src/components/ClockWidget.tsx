import React, { useState, useEffect } from "react";
import { Typography, Box, Stack, Divider } from "@mui/material";
import { differenceInHours, differenceInMinutes, format } from 'date-fns';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import { useTheme } from '../contexts/ThemeContext';

const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { isDark } = useTheme();
  const bedTime = new Date();
  bedTime.setHours(22, 30, 0, 0); // 10:30 PM

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = () => {
    const now = new Date();
    if (now > bedTime) {
      bedTime.setDate(bedTime.getDate() + 1);
    }
    const hoursLeft = differenceInHours(bedTime, now);
    const minutesLeft = differenceInMinutes(bedTime, now) % 60;
    return `${hoursLeft}h ${minutesLeft}m`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', alignItems: 'center' }}>
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
          10:30 PM
        </Typography>
      </Box>
    </Box>
  );
};

export default ClockWidget;
