import React, { useState, useEffect } from "react";
import { Typography, Paper } from "@mui/material";
import { differenceInHours, differenceInMinutes, format } from 'date-fns';

const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());
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
    return `${hoursLeft}h ${minutesLeft}m until bedtime (10:30 PM)`;
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 4, 
        borderRadius: 4,
        textAlign: 'center',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)'
        }
      }}
    >
      <Typography 
        variant="h2" 
        sx={{ 
          fontWeight: 700,
          fontSize: { xs: '2.5rem', sm: '3.75rem' },
          color: 'text.primary',
          mb: 1
        }}
      >
        {format(time, 'hh:mm:ss a')}
      </Typography>
      <Typography 
        variant="h5" 
        sx={{ 
          color: 'text.secondary',
          mb: 2,
          fontSize: { xs: '1.2rem', sm: '1.5rem' }
        }}
      >
        {format(time, 'EEEE, MMMM d, yyyy')}
      </Typography>
      <Typography 
        variant="h6" 
        sx={{ 
          color: 'primary.main',
          fontWeight: 600
        }}
      >
        {getTimeRemaining()}
      </Typography>
    </Paper>
  );
};

export default ClockWidget;
