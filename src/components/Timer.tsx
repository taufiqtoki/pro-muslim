import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Stack, TextField, Button, Grid } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PauseIcon from '@mui/icons-material/Pause';

const Timer: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  const handlePlayPause = () => {
    setIsRunning(prev => !prev);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setTime(0);
    setIsRunning(false);
  };

  const handleSetTime = (totalSeconds?: number) => {
    if (totalSeconds !== undefined) {
      setTime(totalSeconds * 1000);
    } else {
      const totalSeconds = (parseInt(hours || '0', 10) * 3600) + (parseInt(minutes || '0', 10) * 60) + parseInt(seconds || '0', 10);
      if (!isNaN(totalSeconds)) {
        setTime(totalSeconds * 1000);
      }
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isRunning && time > 0) {
      intervalId = setInterval(() => {
        setTime(prev => Math.max(prev - 1000, 0));
      }, 1000);
    } else if (time === 0) {
      setIsRunning(false);
    }

    return () => clearInterval(intervalId);
  }, [isRunning, time]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box 
      sx={{ 
        p: 3, 
        bgcolor: 'background.paper', 
        borderRadius: 2 
      }}
    >
      <Typography 
        variant="h4" 
        align="center" 
        sx={{ 
          mb: 2, 
          p: 1, 
          bgcolor: 'background.default', 
          borderRadius: 1 
        }}
      >
        {formatTime(time)}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="center">
        <IconButton onClick={handlePlayPause} color="primary" size="small">
          {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton onClick={handleStop} color="error" size="small">
          <StopIcon />
        </IconButton>
        <IconButton onClick={handleReset} color="secondary" size="small">
          <RestartAltIcon />
        </IconButton>
      </Stack>
      <Grid container spacing={1} justifyContent="center" sx={{ mt: 2 }}>
        {[1, 3, 5, 10, 15, 30].map((min) => (
          <Grid item xs={6} sm={3} key={min}>
            <Button variant="outlined" onClick={() => handleSetTime(min * 60)} sx={{ width: '100%' }}>
              {min} min
            </Button>
          </Grid>
        ))}
        <Grid item xs={6} sm={3}>
          <Button variant="outlined" onClick={() => handleSetTime(60 * 60)} sx={{ width: '100%' }}>
            1 H
          </Button>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button variant="outlined" onClick={() => handleSetTime(120 * 60)} sx={{ width: '100%' }}>
            2 H
          </Button>
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
        <TextField 
          label="Hours" 
          variant="outlined" 
          size="small" 
          value={hours} 
          onChange={(e) => setHours(e.target.value)} 
        />
        <TextField 
          label="Minutes" 
          variant="outlined" 
          size="small" 
          value={minutes} 
          onChange={(e) => setMinutes(e.target.value)} 
        />
        <TextField 
          label="Seconds" 
          variant="outlined" 
          size="small" 
          value={seconds} 
          onChange={(e) => setSeconds(e.target.value)} 
        />
        <Button variant="contained" onClick={() => handleSetTime()}>Set</Button>
      </Stack>
    </Box>
  );
};

export default Timer;
