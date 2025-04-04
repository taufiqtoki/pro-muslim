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
  Tooltip,
  Divider,
  Popover,
  Paper,
  useMediaQuery,
  useTheme as useMuiTheme
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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Calculator from './Calculator.tsx';
import Timer from './Timer.tsx';
import { useStopwatch } from '../contexts/StopwatchContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';

const Stopwatch: React.FC = () => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { time, isRunning, isStopped, handlePlayPause, handleStop, handleReset } = useStopwatch();
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

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

  const handleInfoClick = (event: React.MouseEvent<HTMLElement>) => {
    setInfoAnchorEl(event.currentTarget);
  };

  const handleInfoClose = () => {
    setInfoAnchorEl(null);
  };

  const infoOpen = Boolean(infoAnchorEl);

  return (
    <>
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        p: { xs: 0, sm: 0 },
        m: 0
      }}>
        {/* Main Content with Divider */}
        <Stack 
          direction="row" 
          spacing={ { xs: 0.5, sm: 1 } }
          divider={<Divider orientation="vertical" flexItem />}
          alignItems="center"
          justifyContent="space-between"
          sx={{ flexGrow: 1, m: 0, p: 0 }}
        >
          {/* Main time display */}
          <Box sx={{ 
            textAlign: 'center', 
            width: { xs: '80%', sm: '75%' },
            flexShrink: 1,
            p: 0,
            m: 0
          }}>
        <Typography 
              variant="h1" 
          sx={{ 
            fontWeight: 700,
                fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
                fontFamily: 'var(--font-display)',
                letterSpacing: '-1px',
                color: isRunning 
                  ? 'primary.main' 
                  : (isStopped ? 'error.main' : 'text.primary'),
                transition: 'color 0.3s ease',
                lineHeight: 1.1,
                textShadow: isRunning 
                  ? (isDark ? '0 0 10px rgba(var(--primary-rgb), 0.5)' : '0 0 15px rgba(var(--primary-rgb), 0.3)')
                  : 'none',
                m: 0,
                p: 0
          }}
        >
          {formatTime(time)}
        </Typography>
            
            {/* Controls */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 1,
              mt: 0.5
            }}>
          {!isStopped && (
                <Fab 
                  onClick={handlePlayPause} 
                  color={isRunning ? "default" : "primary"}
                  size="small"
                  sx={{ 
                    boxShadow: isRunning ? 'none' : 'var(--shadow-md)',
                    bgcolor: isRunning ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : undefined,
                    width: 32,
                    height: 32,
                    minHeight: 'auto'
                  }}
                >
              {isRunning ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                </Fab>
          )}
              
          {(isRunning || (!isRunning && !isStopped)) && (
                <Fab 
                  onClick={handleStop} 
                  color="error"
                  size="small"
                  sx={{ 
                    boxShadow: 'var(--shadow-md)',
                    width: 32,
                    height: 32,
                    minHeight: 'auto'
                  }}
                >
              <StopIcon fontSize="small" />
                </Fab>
              )}
              
              <Fab 
                onClick={handleReset} 
                color="default"
                size="small"
                sx={{ 
                  boxShadow: 'var(--shadow-md)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  width: 32,
                  height: 32,
                  minHeight: 'auto'
                }}
              >
            <RestartAltIcon fontSize="small" />
              </Fab>
            </Box>
          </Box>
          
          {/* Right side tools column */}
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            p: { xs: 0.25, sm: 0.5 },
            borderRadius: 'var(--radius-md)',
            width: { xs: 'auto', sm: 'auto' },
            flexShrink: 0
          }}>
            <Tooltip title="Calculator">
              <IconButton
                onClick={() => setIsCalculatorOpen(true)}
                size="small"
                sx={{ 
                  p: { xs: 0.25, sm: 0.5 },
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                    color: 'primary.main'
                  },
                  width: 34,
                  height: 34,
                  minWidth: 'auto'
                }}
              >
                <CalculateIcon sx={{ fontSize: '1.5rem' }} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Timer">
              <IconButton
                onClick={() => setIsTimerOpen(true)}
                size="small"
                sx={{ 
                  p: { xs: 0.25, sm: 0.5 },
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                    color: 'primary.main'
                  },
                  width: 34,
                  height: 34,
                  minWidth: 'auto'
                }}
              >
                <TimerIcon sx={{ fontSize: '1.5rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </Box>

      {/* Info Popover */}
      <Popover
        open={infoOpen}
        anchorEl={infoAnchorEl}
        onClose={handleInfoClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            p: 2,
            maxWidth: 300,
            borderRadius: 'var(--radius-md)'
          }
        }}
      >
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Keyboard Shortcuts
        </Typography>
        <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Press <Box component="span" sx={{ fontWeight: 600 }}>Space</Box> to play/pause
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Press <Box component="span" sx={{ fontWeight: 600 }}>S</Box> to stop
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Press <Box component="span" sx={{ fontWeight: 600 }}>R</Box> to reset
          </Typography>
        </Box>
      </Popover>

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
