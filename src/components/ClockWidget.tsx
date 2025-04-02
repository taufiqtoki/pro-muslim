import React, { useState, useEffect } from "react";
import { Typography, Box, Stack, Divider } from "@mui/material";
import { differenceInHours, differenceInMinutes, format } from 'date-fns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
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
    <Box>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        divider={<Divider orientation="vertical" flexItem />}
        alignItems="center"
        justifyContent="space-between"
      >
        <Box sx={{ textAlign: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              letterSpacing: '-1px',
              color: 'text.primary',
              mb: 1,
              fontFamily: 'var(--font-display)'
            }}
          >
            {format(time, 'hh:mm')}
            <Typography 
              component="span" 
              sx={{ 
                fontSize: { xs: '1.5rem', sm: '2rem' },
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
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 500,
                ml: 1,
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
              mb: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 500
            }}
          >
            {format(time, 'EEEE, MMMM d, yyyy')}
          </Typography>
        </Box>
        
        <Box 
          sx={{ 
            textAlign: 'center',
            p: 2,
            borderRadius: 'var(--radius-md)',
            bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <Stack 
            direction="row" 
            spacing={1} 
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 1 }}
          >
            <NightsStayIcon color="primary" fontSize="small" />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Time Until Bedtime
            </Typography>
          </Stack>
          
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '2rem' },
              color: 'primary.main'
            }}
          >
            {getTimeRemaining()}
          </Typography>
          
          <Typography variant="caption" color="text.secondary">
            Scheduled bedtime: 10:30 PM
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default ClockWidget;
