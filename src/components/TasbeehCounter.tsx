import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, useTheme, LinearProgress, Alert, ToggleButtonGroup, ToggleButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveIcon from '@mui/icons-material/Remove';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CheckIcon from '@mui/icons-material/Check';

interface TasbeehCounterProps {
  tasbeeh: string;
  goal: number;
  initialCount?: number;
  onClose: (count: number) => void;
}

// Theme options
type ThemeOption = 'black-gold' | 'black-white' | 'white-black';

const TasbeehCounter: React.FC<TasbeehCounterProps> = ({ tasbeeh, goal, initialCount = 0, onClose }) => {
  const [count, setCount] = useState(initialCount);
  const [showCompletionAlert, setShowCompletionAlert] = useState(false);
  const [themeOption, setThemeOption] = useState<ThemeOption>('black-gold');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const theme = useTheme();
  
  const progress = Math.min(100, (count / goal) * 100);

  useEffect(() => {
    if (count >= goal && !showCompletionAlert) {
      setShowCompletionAlert(true);
      // Hide the alert after 3 seconds
      const timer = setTimeout(() => setShowCompletionAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [count, goal, showCompletionAlert]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Stop event propagation to prevent triggering Stopwatch keyboard shortcuts
      e.stopPropagation();
      
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        handleIncrement();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleReset();
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        handleDecrement();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  const handleDecrement = () => {
    setCount(prev => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setCount(0);
    setShowCompletionAlert(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Get color based on progress
  const getProgressColor = () => {
    if (progress >= 100) return 'info'; // Blue at 100%
    if (progress >= 30) return 'success'; // Green from 30% to 99%
    return 'secondary'; // Black/dark until 30%
  };

  // Handle theme change
  const handleThemeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTheme: ThemeOption | null,
  ) => {
    if (newTheme !== null) {
      setThemeOption(newTheme);
    }
  };

  // Get theme styles based on selected theme
  const getThemeStyles = () => {
    switch (themeOption) {
      case 'black-gold':
        return {
          background: '#000000',
          color: '#FFD700', // Gold
          buttonColor: '#FFD700',
          buttonBg: '#222222'
        };
      case 'black-white':
        return {
          background: '#000000',
          color: '#FFFFFF',
          buttonColor: '#FFFFFF',
          buttonBg: '#333333'
        };
      case 'white-black':
        return {
          background: '#FFFFFF',
          color: '#000000',
          buttonColor: '#000000',
          buttonBg: '#F5F5F5'
        };
      default:
        return {
          background: '#000000',
          color: '#FFD700',
          buttonColor: '#FFD700',
          buttonBg: '#222222'
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <Dialog 
      open 
      fullScreen 
      PaperProps={{ 
        sx: {
          bgcolor: themeStyles.background,
          backgroundImage: isFullscreen ? 'none' : undefined
        } 
      }}
    >
      <Box sx={{ 
        bgcolor: themeStyles.background, 
        color: themeStyles.color,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: themeStyles.color }}>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: themeStyles.color }}>
              {tasbeeh}
            </Typography>
            <Typography variant="caption" sx={{ color: themeStyles.color, opacity: 0.8 }}>
              Goal: {goal}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ToggleButtonGroup
              value={themeOption}
              exclusive
              onChange={handleThemeChange}
              size="small"
              sx={{ mr: 1 }}
            >
              <ToggleButton value="black-gold" aria-label="black gold theme" sx={{ color: themeOption === 'black-gold' ? '#FFD700' : 'inherit' }}>
                <AutoAwesomeIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="black-white" aria-label="black white theme" sx={{ color: themeOption === 'black-white' ? '#FFFFFF' : 'inherit' }}>
                <DarkModeIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="white-black" aria-label="white black theme" sx={{ color: themeOption === 'white-black' ? '#000000' : 'inherit' }}>
                <LightModeIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>

            <IconButton
              onClick={toggleFullscreen}
              sx={{ 
                color: themeStyles.color
              }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
            
            <IconButton
              aria-label="close"
              onClick={() => onClose(count)}
              sx={{ color: themeStyles.color }}
            >
            </IconButton>
          </Box>
        </DialogTitle>

        {showCompletionAlert && (
          <Alert 
            severity="success" 
            icon={<CheckCircleIcon fontSize="inherit" />}
            sx={{ mx: 2 }}
          >
            Goal completed! Keep going or press done to finish.
          </Alert>
        )}
        
        <Box sx={{ px: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            color={getProgressColor()}
            sx={{ 
              height: 8, 
              borderRadius: 8,
              my: 1,
              bgcolor: themeOption === 'white-black' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: themeStyles.color, opacity: 0.8 }}>
              {count}
            </Typography>
            <Typography variant="body2" sx={{ color: themeStyles.color, opacity: 0.8 }}>
              {goal}
            </Typography>
          </Box>
        </Box>

        <Box
          onClick={handleIncrement}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background-color 0.2s',
            '&:active': {
              bgcolor: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          <Typography 
            variant="h1" 
            sx={{ 
              color: themeStyles.color, 
              fontWeight: 700,
              fontSize: { xs: '5rem', sm: '8rem' },
              transition: 'transform 0.1s',
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            {count}
          </Typography>
        </Box>

        <DialogActions 
          sx={{ 
            bgcolor: themeStyles.background,
            justifyContent: 'space-between', 
            p: 2,
            borderTop: '1px solid',
            borderColor: themeOption === 'white-black' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
          }}
        >
          <Button 
            onClick={handleReset} 
            variant="text"
            sx={{ 
              color: themeStyles.color,
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600
            }}
          >
            Reset
          </Button>
          
          <Button 
            onClick={handleDecrement} 
            variant="contained"
            disabled={count === 0}
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              bgcolor: themeStyles.buttonBg,
              color: themeStyles.buttonColor,
              '&:hover': {
                bgcolor: themeOption === 'white-black' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
              },
              minWidth: '40px',
              px: 1
            }}
          >
            <RemoveIcon />
          </Button>
          
          <Button 
            onClick={() => onClose(count)} 
            variant="contained"
            startIcon={<CheckIcon />}
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              bgcolor: themeOption === 'black-gold' ? '#FFD700' : 'primary.main',
              color: themeOption === 'black-gold' ? '#000000' : 'white',
              '&:hover': {
                bgcolor: themeOption === 'black-gold' ? '#E5C100' : undefined,
              }
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default TasbeehCounter;
