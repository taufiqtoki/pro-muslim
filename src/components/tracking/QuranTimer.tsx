import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';

const QuranTimer: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Quran Reading
      </Typography>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 2, fontFamily: 'monospace' }}>
          {formatTime(time)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            color="primary"
            fullWidth
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? 'Stop' : 'Start'}
          </Button>
          <Button 
            variant="outlined" 
            color="success"
            fullWidth
            disabled={time === 0}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default QuranTimer;
