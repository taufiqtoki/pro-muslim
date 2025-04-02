import React, { useState, useEffect } from "react";
import { 
  Typography, 
  IconButton, 
  Stack, 
  Box, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Fab,
  Tooltip
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PauseIcon from '@mui/icons-material/Pause';
import CalculateIcon from '@mui/icons-material/Calculate';
import TimerIcon from '@mui/icons-material/Timer';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CloseIcon from '@mui/icons-material/Close';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import Calculator from './Calculator.tsx';
import Timer from './Timer.tsx';
import { useStopwatch } from '../contexts/StopwatchContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';

const Stopwatch: React.FC = () => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const navigate = useNavigate();
  const { time, isRunning, isStopped, handlePlayPause, handleStop, handleReset } = useStopwatch();
  const { isDark } = useTheme();

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
      <Box>
        <Box
          sx={{
            textAlign: 'center',
            mb: 3,
            position: 'relative'
          }}
        >
          <Typography 
            variant="h1" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              fontFamily: 'var(--font-display)',
              letterSpacing: '-1px',
              color: isRunning 
                ? 'primary.main' 
                : (isStopped ? 'error.main' : 'text.primary'),
              transition: 'color 0.3s ease',
              mb: 2,
              textShadow: isRunning 
                ? (isDark ? '0 0 10px rgba(var(--primary-rgb), 0.5)' : '0 0 15px rgba(var(--primary-rgb), 0.3)')
                : 'none'
            }}
          >
            {formatTime(time)}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
            {!isStopped && (
              <Fab 
                onClick={handlePlayPause} 
                color={isRunning ? "default" : "primary"}
                size="medium"
                sx={{ 
                  boxShadow: isRunning ? 'none' : 'var(--shadow-md)',
                  bgcolor: isRunning ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : undefined
                }}
              >
                {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
              </Fab>
            )}
            
            {(isRunning || (!isRunning && !isStopped)) && (
              <Fab 
                onClick={handleStop} 
                color="error"
                size="medium"
                sx={{ boxShadow: 'var(--shadow-md)' }}
              >
                <StopIcon />
              </Fab>
            )}
            
            <Fab 
              onClick={handleReset} 
              color="default"
              size="medium"
              sx={{ 
                boxShadow: 'var(--shadow-md)',
                bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <RestartAltIcon />
            </Fab>
          </Box>
          
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'block', 
              mb: 3,
              fontStyle: 'italic'
            }}
          >
            Tip: Press spacebar to play/pause, &apos;S&apos; to stop, &apos;R&apos; to reset
          </Typography>
          
          <Stack 
            direction="row" 
            spacing={1} 
            justifyContent="center"
            sx={{
              p: 2,
              borderRadius: 'var(--radius-md)',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              display: 'inline-flex'
            }}
          >
            <Tooltip title="Calculator">
              <IconButton
                onClick={() => setIsCalculatorOpen(true)}
                sx={{ 
                  borderRadius: 'var(--radius-md)',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    color: 'primary.main'
                  }
                }}
              >
                <CalculateIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Timer">
              <IconButton
                onClick={() => setIsTimerOpen(true)}
                sx={{ 
                  borderRadius: 'var(--radius-md)',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    color: 'primary.main'
                  }
                }}
              >
                <TimerIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Music Player">
              <IconButton
                onClick={() => navigate('/player')}
                sx={{ 
                  borderRadius: 'var(--radius-md)',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    color: 'primary.main'
                  }
                }}
              >
                <MusicNoteIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      <Dialog 
        open={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-md)',
            overflowY: 'visible'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Calculator
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setIsCalculatorOpen(false)}
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: 'error.main'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Calculator />
        </DialogContent>
      </Dialog>

      <Dialog 
        open={isTimerOpen} 
        onClose={() => setIsTimerOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-md)',
            overflowY: 'visible'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Timer
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setIsTimerOpen(false)}
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: 'error.main'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Timer />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Stopwatch;
