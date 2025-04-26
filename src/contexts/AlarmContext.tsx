import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Dialog,
  TextField,
  Box,
  Typography,
  Divider,
  Slider,
  InputAdornment,
  Snackbar,
  Fade,
  Slide,
  Button,
  DialogActions,
  DialogTitle,
  IconButton
} from '@mui/material';
import { format, parse, isEqual, differenceInMinutes } from 'date-fns';
import { useTheme } from './ThemeContext';
import AlarmIcon from '@mui/icons-material/Alarm';
import CheckIcon from '@mui/icons-material/Check';
import SwipeRightAltIcon from '@mui/icons-material/SwipeRightAlt';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Close';
import { v4 as uuidv4 } from 'uuid';
// Import the alarm sound
import alarmSound from '../assets/islamic_wakeup.mp3';

// Slide transition for modal
const SlideTransition = React.forwardRef(function Transition(props: any, ref: any) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Define alarm interface
interface Alarm {
  id: string;
  time: string; // HH:mm format
  label: string;
  active: boolean;
  lastTriggered?: string; // ISO date string to prevent multiple triggers
}

// Define the context type
interface AlarmContextType {
  alarms: Alarm[];
  addAlarm: (time: string, label: string) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  ringingAlarm: Alarm | null;
  stopAlarmRinging: () => void;
}

// Create context with default values
const AlarmContext = createContext<AlarmContextType>({
  alarms: [],
  addAlarm: () => console.log('AlarmContext not initialized'),
  deleteAlarm: () => console.log('AlarmContext not initialized'),
  toggleAlarm: () => console.log('AlarmContext not initialized'),
  ringingAlarm: null,
  stopAlarmRinging: () => console.log('AlarmContext not initialized')
});

// Custom hook to use the alarm context
export const useAlarm = () => useContext(AlarmContext);

// Provider component that will wrap the app
export const AlarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark } = useTheme();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [verificationText, setVerificationText] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Reference to the audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedRef = useRef(false);
  
  // Create the audio element on mount
  useEffect(() => {
    try {
      console.log('Creating audio element in AlarmContext');
      audioRef.current = new Audio(alarmSound);
      audioRef.current.loop = true;
      audioRef.current.volume = 1.0;
      audioRef.current.load();
      
      // Try preloading the audio
      document.addEventListener('click', function tryToPreloadOnUserInteraction() {
        console.log('User interaction detected, trying to preload audio');
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
              console.log('Audio preload successful');
              audioRef.current?.pause();
              audioRef.current!.currentTime = 0;
            })
            .catch(err => {
              console.log('Audio preload failed, will try again on alarm trigger:', err);
            });
        }
        document.removeEventListener('click', tryToPreloadOnUserInteraction);
      }, { once: true });
      
    } catch (error) {
      console.error('Error creating audio element in AlarmContext:', error);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Load alarms from localStorage on mount and set interval for checking
  useEffect(() => {
    // Load the alarms immediately
    try {
      console.log('Loading alarms from localStorage on mount');
      const storedAlarms = localStorage.getItem('alarms');
      
      if (storedAlarms) {
        try {
          const parsedAlarms = JSON.parse(storedAlarms) as Alarm[];
          if (Array.isArray(parsedAlarms)) {
            console.log(`Loaded ${parsedAlarms.length} alarms from localStorage`);
            setAlarms(parsedAlarms);
            loadedRef.current = true;
          } else {
            console.error('Stored alarms is not an array, initializing empty array', typeof parsedAlarms);
            setAlarms([]);
          }
        } catch (parseError) {
          console.error('Error parsing stored alarms JSON, initializing empty array:', parseError);
          setAlarms([]);
        }
      } else {
        console.log('No alarms found in localStorage, initializing empty array');
        setAlarms([]);
      }
    } catch (error) {
      console.error('Error loading alarms from localStorage:', error);
      setAlarms([]);
    }
    
    // Setup alarm checking interval
    const checkInterval = setInterval(() => {
      console.log('Checking alarms in AlarmContext at:', new Date().toLocaleTimeString());
      checkAlarms();
    }, 15000); // Check more frequently (every 15 seconds)
    
    // Also check once immediately after loading
    setTimeout(() => {
      console.log('Initial alarm check after loading');
      checkAlarms();
    }, 2000); // Small delay to ensure component is fully mounted
    
    return () => {
      clearInterval(checkInterval);
    };
  }, []); // Empty dependency array - only run once on mount
  
  // Save alarms to localStorage whenever they change
  useEffect(() => {
    if (alarms && alarms.length >= 0 && loadedRef.current) {
      console.log('Saving alarms to localStorage due to alarm state change:', alarms.length);
      try {
        localStorage.setItem('alarms', JSON.stringify(alarms));
        console.log('Successfully saved alarms to localStorage');
      } catch (error) {
        console.error('Error saving alarms to localStorage:', error);
      }
    }
  }, [alarms]);
  
  // Check alarms to see if any need to be triggered
  const checkAlarms = () => {
    if (!alarms || alarms.length === 0) return;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    console.log('Checking alarms at:', currentTime, 'Active alarms:', alarms.filter(a => a.active).length);
    
    // Find active alarms that match the current time
    const matchingAlarms = alarms.filter(alarm => {
      if (!alarm.active) return false;
      
      // Check for time match
      if (alarm.time === currentTime) {
        // Check if it has already been triggered recently
        if (alarm.lastTriggered) {
          const lastTriggered = new Date(alarm.lastTriggered);
          const diffInMinutes = differenceInMinutes(now, lastTriggered);
          
          // If alarm was triggered less than 1 minute ago, don't trigger again
          if (diffInMinutes < 1) {
            return false;
          }
        }
        
        return true;
      }
      
      return false;
    });
    
    if (matchingAlarms.length > 0) {
      console.log('🔔 ALARM(S) MATCHED:', matchingAlarms);
      
      // Update the lastTriggered property for each matching alarm
      setAlarms(currentAlarms => 
        currentAlarms.map(alarm => 
          matchingAlarms.find(a => a.id === alarm.id)
            ? { ...alarm, lastTriggered: new Date().toISOString() }
            : alarm
        )
      );
      
      // Trigger the first matching alarm directly
      triggerAlarm(matchingAlarms[0]);
    }
  };
  
  // Trigger an alarm
  const triggerAlarm = (alarm: Alarm) => {
    console.log('🔊 Triggering alarm in AlarmContext:', alarm);
    
    if (ringingAlarm) {
      console.log('Another alarm is already ringing, skipping');
      return;
    }
    
    setRingingAlarm(alarm);
    setShowNotification(true);
    setVerificationText('');
    setSliderValue(0);
    
    // Play sound
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        
        // Ensure the correct sound file is loaded
        audioRef.current.src = alarmSound;
        audioRef.current.load();
        
        audioRef.current.volume = 1.0;
        audioRef.current.loop = true;
        
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => console.log('✅ Alarm sound playing successfully'))
            .catch(err => {
              console.error('❌ Error playing alarm sound:', err);
              
              // Try again after a short delay (sometimes helps with autoplay restrictions)
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.play()
                    .then(() => console.log('Alarm sound playing on retry'))
                    .catch(e => console.error('Still failed to play alarm sound on retry:', e));
                }
              }, 1000);
            });
        }
      } else {
        console.error('Audio reference is null, creating new audio element');
        
        // Create new audio element if missing
        audioRef.current = new Audio(alarmSound);
        audioRef.current.loop = true;
        audioRef.current.volume = 1.0;
        audioRef.current.play()
          .catch(err => console.error('Failed to play with new audio element:', err));
      }
    } catch (error) {
      console.error('Error in alarm sound playback:', error);
    }
    
    // Vibrate if available
    if ('vibrate' in navigator) {
      navigator.vibrate([1000, 500, 1000, 500, 1000]);
    }
  };
  
  // Handle slider change
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setSliderValue(value);
    
    // Auto-stop alarm at 100%
    if (value === 100 && verificationText === 'Alhamdulillah') {
      console.log('Slider reached 100% with correct text - stopping alarm');
      
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (error) {
        console.error('Error stopping alarm sound:', error);
      }
      
      setRingingAlarm(null);
      setShowNotification(false);
      setVerificationText('');
      setSliderValue(0);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
      
      showToastMessage('অ্যালার্ম বন্ধ করা হয়েছে');
    }
  };
  
  // Check if alarm can be stopped
  const canStopAlarm = () => {
    return verificationText === 'Alhamdulillah' && sliderValue === 100;
  };
  
  // Handle text verification change
  const handleVerificationTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationText(e.target.value);
  };
  
  // Show toast message
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  // Add new alarm
  const addAlarm = (time: string, label: string) => {
    const newAlarm: Alarm = {
      id: uuidv4(),
      time,
      label: label || 'Alarm',
      active: true
    };
    
    console.log('Adding new alarm in AlarmContext:', newAlarm);
    const updatedAlarms = [...alarms, newAlarm];
    setAlarms(updatedAlarms);
    showToastMessage('অ্যালার্ম সেট করা হয়েছে');
  };
  
  // Delete an alarm
  const deleteAlarm = (id: string) => {
    const updatedAlarms = alarms.filter(alarm => alarm.id !== id);
    setAlarms(updatedAlarms);
    showToastMessage('অ্যালার্ম মুছে ফেলা হয়েছে');
  };
  
  // Toggle alarm active state
  const toggleAlarm = (id: string) => {
    const updatedAlarms = alarms.map(alarm => 
      alarm.id === id ? { ...alarm, active: !alarm.active } : alarm
    );
    setAlarms(updatedAlarms);
    
    const updatedAlarm = updatedAlarms.find(alarm => alarm.id === id);
    if (updatedAlarm) {
      showToastMessage(updatedAlarm.active ? 
        'অ্যালার্ম সক্রিয় করা হয়েছে' : 
        'অ্যালার্ম নিষ্ক্রিয় করা হয়েছে');
    }
  };
  
  // Function to load alarms from localStorage
  const loadAlarmsFromStorage = () => {
    try {
      const savedAlarms = localStorage.getItem('alarms');
      if (savedAlarms) {
        setAlarms(JSON.parse(savedAlarms));
      } else {
        // Default alarms if none exist
        setAlarms([]);
      }
    } catch (error) {
      console.error('Failed to load alarms from localStorage:', error);
      setAlarms([]);
    }
  };

  // Function to stop alarm ringing with better error handling
  const stopAlarmRinging = () => {
    console.log('Attempting to stop alarm...');
    
    if (!canStopAlarm()) {
      showToastMessage('অ্যালার্ম বন্ধ করতে "Alhamdulillah" লিখুন এবং স্লাইডার 100% পর্যন্ত টানুন');
      return;
    }
    
    console.log('Stopping alarm - conditions met');
    
    // Stop the audio with multiple fallbacks
    try {
      if (audioRef.current) {
        console.log('Pausing audio...');
        audioRef.current.pause();
        
        try {
          if (audioRef.current.fastSeek) {
            audioRef.current.fastSeek(0);
          } else {
            audioRef.current.currentTime = 0;
          }
        } catch (seekError) {
          console.error('Error resetting audio position:', seekError);
        }
        
        // Just to be extra sure, try to unload the audio
        try {
          audioRef.current.src = '';
          audioRef.current.load();
        } catch (unloadError) {
          console.error('Error unloading audio:', unloadError);
        }
      } else {
        console.warn('Audio reference is null when trying to stop alarm');
      }
    } catch (error) {
      console.error('Error stopping alarm audio:', error);
    }
    
    // Stop vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    
    // Reset states
    setRingingAlarm(null);
    setShowNotification(false);
    setVerificationText('');
    setSliderValue(0);
    
    showToastMessage('অ্যালার্ম বন্ধ করা হয়েছে');
  };
  
  return (
    <AlarmContext.Provider
      value={{
        alarms,
        addAlarm,
        deleteAlarm,
        toggleAlarm,
        ringingAlarm,
        stopAlarmRinging
      }}
    >
      {children}
      
      {/* Global Alarm Dialog that can appear on any route */}
      <Dialog
        open={showNotification}
        TransitionComponent={SlideTransition as any}
        keepMounted
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            bgcolor: isDark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'
          }
        }}
      >
        <Box sx={{
          animation: 'pulse 1s infinite ease-in-out',
          bgcolor: 'primary.main',
          p: 2,
          '@keyframes pulse': {
            '0%': { opacity: 0.7 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.7 },
          }
        }}>
          <Typography variant="h5" align="center" sx={{ color: '#fff', fontWeight: 700 }}>
            অ্যালার্ম বাজছে!
          </Typography>
        </Box>
        
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <AlarmIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {ringingAlarm && format(parse(ringingAlarm.time, 'HH:mm', new Date()), 'hh:mm a')}
            </Typography>
            
            <Typography variant="h6" color="text.secondary">
              {ringingAlarm?.label}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Verification Text Input */}
          <TextField
            fullWidth
            label="'Alhamdulillah' লিখুন"
            variant="outlined"
            value={verificationText}
            onChange={handleVerificationTextChange}
            error={verificationText !== '' && verificationText !== 'Alhamdulillah'}
            helperText={verificationText !== '' && verificationText !== 'Alhamdulillah' ? 'হুবহু "Alhamdulillah" লিখতে হবে' : ''}
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: verificationText === 'Alhamdulillah' ? (
                <InputAdornment position="end">
                  <CheckIcon color="success" />
                </InputAdornment>
              ) : null
            }}
          />
          
          {/* iPhone-style Slider */}
          <Box sx={{ 
            width: '100%', 
            mb: 3,
            mt: 4,
            position: 'relative',
            height: 60,
            borderRadius: 30,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
          }}>
            {/* Sliding track */}
            <Box sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${sliderValue}%`,
              background: verificationText === 'Alhamdulillah' 
                ? 'linear-gradient(to right, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.3))' 
                : 'rgba(255,255,255,0.1)',
              transition: 'width 0.1s ease',
              zIndex: 1
            }} />
            
            {/* Slider label */}
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                width: '100%',
                textAlign: 'center',
                zIndex: 2,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.85rem',
                color: 'text.secondary',
                userSelect: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1
              }}
            >
              <SwipeRightAltIcon /> স্লাইড করে অ্যালার্ম বন্ধ করুন
            </Typography>
            
            {/* Slider component */}
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              aria-labelledby="alarm-stop-slider"
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                padding: 0,
                opacity: 0,
                zIndex: 3,
                '& .MuiSlider-thumb': {
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                },
                '& .MuiSlider-rail': {
                  opacity: 0,
                }
              }}
              disabled={verificationText !== 'Alhamdulillah'}
            />
            
            {/* Thumb indicator */}
            <Box 
              sx={{
                position: 'absolute',
                left: `calc(${sliderValue}% - 30px)`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: verificationText === 'Alhamdulillah' ? 'primary.main' : 'grey.400',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'left 0.1s ease',
                zIndex: 2,
                opacity: verificationText === 'Alhamdulillah' ? 1 : 0.5,
              }}
            >
              {verificationText === 'Alhamdulillah' ? (
                <SwipeRightAltIcon sx={{ color: 'white' }} />
              ) : (
                <LockIcon sx={{ color: 'white' }} />
              )}
            </Box>
          </Box>
          
          <Typography 
            variant="caption" 
            color={canStopAlarm() ? "success.main" : "text.secondary"}
            sx={{ display: 'block', mb: 3 }}
          >
            {canStopAlarm() 
              ? "অ্যালার্ম বন্ধ হয়েছে" 
              : verificationText === 'Alhamdulillah' 
                ? "অ্যালার্ম বন্ধ করতে পুরোপুরি স্লাইড করুন" 
                : "প্রথমে 'Alhamdulillah' টাইপ করুন"}
          </Typography>
        </Box>
      </Dialog>
      
      {/* Global Toast */}
      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        TransitionComponent={Fade}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </AlarmContext.Provider>
  );
}; 