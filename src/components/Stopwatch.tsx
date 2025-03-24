import React, { useState, useEffect } from "react";
import { Typography, IconButton, Stack, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PauseIcon from '@mui/icons-material/Pause';
import CalculateIcon from '@mui/icons-material/Calculate';
import TimerIcon from '@mui/icons-material/Timer';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CloseIcon from '@mui/icons-material/Close';
import Calculator from './Calculator.tsx';
import Timer from './Timer.tsx';
import { useStopwatch } from '../contexts/StopwatchContext.tsx';

const Stopwatch: React.FC = () => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const navigate = useNavigate();
  const { time, isRunning, isStopped, handlePlayPause, handleStop, handleReset } = useStopwatch();

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    const { key } = event;
    if (key === ' ') {
      handlePlayPause();
    } else if (key === 's') {
      handleStop();
    } else if (key === 'r') {
      handleReset();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
          Stopwatch
        </Typography>
        <Typography 
          variant="h2" 
          sx={{ 
            fontWeight: 700,
            fontSize: { xs: '1.8rem', sm: '2.2rem' },
            fontFamily: 'monospace',
            mb: 1
          }}
        >
          {formatTime(time)}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center">
          {!isStopped && (
            <IconButton onClick={handlePlayPause} color="primary" size="small">
              {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          )}
          {(isRunning || (!isRunning && !isStopped)) && (
            <IconButton onClick={handleStop} color="error" size="small">
              <StopIcon />
            </IconButton>
          )}
          <IconButton onClick={handleReset} color="secondary" size="small">
            <RestartAltIcon />
          </IconButton>
          <IconButton
            onClick={() => setIsCalculatorOpen(true)}
            color="default"
            size="small"
          >
            <CalculateIcon />
          </IconButton>
          <IconButton
            onClick={() => setIsTimerOpen(true)}
            color="default"
            size="small"
          >
            <TimerIcon />
          </IconButton>
          <IconButton
            onClick={() => navigate('/player')}
            color="default"
            size="small"
          >
            <MusicNoteIcon />
          </IconButton>
        </Stack>
      </Paper>

      <Dialog open={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Calculator
          <IconButton
            aria-label="close"
            onClick={() => setIsCalculatorOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Calculator />
        </DialogContent>
        <DialogActions>
        </DialogActions>
      </Dialog>

      <Dialog open={isTimerOpen} onClose={() => setIsTimerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Timer
          <IconButton
            aria-label="close"
            onClick={() => setIsTimerOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Timer />
        </DialogContent>
        <DialogActions>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Stopwatch;
