import React, { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Box,
  IconButton,
  TextField,
  Button,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Chip,
  Alert,
  Slide,
  Fade,
  Snackbar,
  Divider,
  Backdrop,
  Slider,
  InputAdornment,
  CircularProgress,
  useTheme as useMuiTheme,
  useMediaQuery,
  Container,
  InputLabel,
  FormControl,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AlarmIcon from '@mui/icons-material/Alarm';
import CloseIcon from '@mui/icons-material/Close';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import SwipeRightAltIcon from '@mui/icons-material/SwipeRightAlt';
import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import { useTheme } from '../contexts/ThemeContext';
import { format, addMinutes, parse, isEqual, startOfMinute, differenceInMinutes, setSeconds, compareAsc, addDays } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { useAlarm } from '../contexts/AlarmContext';
import { v4 as uuidv4 } from 'uuid';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// Re-enable audio import 
import alarmSound from '../assets/islamic_wakeup.mp3';

interface Alarm {
  id: string;
  time: string; // HH:mm format
  label: string;
  active: boolean;
  lastTriggered?: string; // ISO date string to prevent multiple triggers
}

// Create transition component for modal
const SlideTransition = React.forwardRef(function Transition(props: any, ref: any) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Define the props interface with optional onClose
interface AlarmClockProps {
  isModal?: boolean;
  onClose?: () => void;
}

const AlarmClock: React.FC<AlarmClockProps> = ({ isModal = false, onClose }) => {
  const { isDark } = useTheme();
  const location = useLocation();
  const { alarms, addAlarm, deleteAlarm, toggleAlarm } = useAlarm();
  const [openDialog, setOpenDialog] = useState(false);
  const [alarmTime, setAlarmTime] = useState<Date | null>(new Date());
  const [alarmLabel, setAlarmLabel] = useState('');
  const [remainingSleepTime, setRemainingSleepTime] = useState<number | null>(null);
  const [useSleepTime, setUseSleepTime] = useState(false);
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [verificationText, setVerificationText] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  
  // Re-enable audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const muiTheme = useMuiTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  
  // Re-enable audio setup with better error handling
  useEffect(() => {
    // Create audio element
    try {
      console.log('Creating audio element with sound:', alarmSound);
      audioRef.current = new Audio(alarmSound);
      audioRef.current.loop = true; // Loop the sound
      audioRef.current.volume = 1.0; // Maximum volume
      
      // Preload the audio
      audioRef.current.load();
      
      console.log('Audio element created successfully:', audioRef.current);
      
      // Test if audio can be played
      const testPlay = () => {
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
              console.log('Audio test play successful');
              // Stop after 100ms to avoid annoyance
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                  console.log('Audio test stopped');
                }
              }, 100);
            })
            .catch(err => {
              console.error('Audio test play failed - may need user interaction first:', err);
            });
        }
      };
      
      // Uncomment this line to test audio on component load - usually needs user interaction first
      // testPlay();
    } catch (error) {
      console.error('Error creating audio element:', error);
    }
    
    // Cleanup on unmount
    return () => {
      console.log('Cleaning up audio element');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // COMPLETELY REWRITTEN saveAlarmsToStorage function with direct verification
  const saveAlarmsToStorage = (alarmsToSave: Alarm[]) => {
    try {
      // Filter out any null or undefined alarms to prevent storage issues
      const validAlarms = alarmsToSave.filter(alarm => alarm && alarm.id);
      
      if (validAlarms.length === 0) {
        console.warn('No valid alarms to save');
        return false;
      }
      
      // First stringify the alarms
      const alarmsJSON = JSON.stringify(validAlarms);
      console.log(`Attempting to save ${validAlarms.length} alarms: ${alarmsJSON}`);
      
      // Save to localStorage
      localStorage.setItem('alarms', alarmsJSON);
      
      // Immediately verify the save worked by reading it back
      const savedData = localStorage.getItem('alarms');
      
      if (!savedData) {
        console.error('Failed to save alarms - localStorage.getItem returned null');
        return false;
      }
      
      try {
        const parsedSavedData = JSON.parse(savedData) as Alarm[];
        
        if (!Array.isArray(parsedSavedData) || parsedSavedData.length !== validAlarms.length) {
          console.error(`Save verification failed - expected ${validAlarms.length} alarms but got ${parsedSavedData?.length || 0}`);
          return false;
        }
        
        console.log(`✅ Successfully saved ${parsedSavedData.length} alarms to localStorage`);
        return true;
      } catch (parseError) {
        console.error('Error parsing saved alarms JSON:', parseError);
        return false;
      }
    } catch (error) {
      console.error('Error saving alarms to localStorage:', error);
      return false;
    }
  };

  // Auto-save on component unmount and route changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('Window unloading - saving alarms');
      if (alarms && Array.isArray(alarms) && alarms.length > 0) {
        saveAlarmsToStorage(alarms);
      } else {
        console.log('No alarms to save on window unload');
      }
    };
    
    // Set up a local interval to check alarms when the AlarmClock component is mounted
    console.log('Setting up alarm checking interval in AlarmClock component');
    const localCheckInterval = setInterval(() => {
      // Manual check for current time matching any alarm times
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      
      console.log(`AlarmClock component checking for alarms at ${currentTime}`);
      
      // Find matching alarms
      const matchingAlarms = alarms.filter(alarm => {
        if (!alarm.active) return false;
        if (alarm.time !== currentTime) return false;
        
        // Check if already triggered recently
        if (alarm.lastTriggered) {
          const lastTriggered = new Date(alarm.lastTriggered);
          const diffInMinutes = differenceInMinutes(now, lastTriggered);
          if (diffInMinutes < 1) return false;
        }
        
        return true;
      });
      
      if (matchingAlarms.length > 0) {
        console.log('Found matching alarms in AlarmClock component:', matchingAlarms);
        
        // Update lastTriggered
        const updatedAlarms = alarms.map(alarm => 
          matchingAlarms.find(a => a.id === alarm.id)
            ? { ...alarm, lastTriggered: new Date().toISOString() }
            : alarm
        );
        
        // Update alarms state with the updated lastTriggered values
        // This will indirectly call toggleAlarm which saves to localStorage
        matchingAlarms.forEach(alarm => {
          // Toggle off and back on to trigger a state update
          toggleAlarm(alarm.id);
          setTimeout(() => toggleAlarm(alarm.id), 100);
        });
        
        // Try to trigger alarm with sound
        try {
          if (audioRef.current) {
            audioRef.current.play()
              .then(() => console.log('Alarm sound playing from AlarmClock component'))
              .catch(err => console.error('Failed to play alarm sound from AlarmClock:', err));
          }
        } catch (error) {
          console.error('Error playing alarm sound from AlarmClock component:', error);
        }
      }
    }, 30000); // Check every 30 seconds
    
    // Add event listener for window close/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up function
    return () => {
      console.log('AlarmClock component unmounting - saving alarms and clearing interval');
      clearInterval(localCheckInterval);
      
      if (alarms && Array.isArray(alarms) && alarms.length > 0) {
        saveAlarmsToStorage(alarms);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [alarms, toggleAlarm]); // Re-run when alarms change
  
  // Function to trigger alarm with sound - improved with better debugging
  const triggerAlarm = (alarm: Alarm) => {
    console.log('🔊 Triggering alarm:', alarm);
    
    // Don't trigger if another alarm is already ringing
    if (ringingAlarm) {
      console.log('Another alarm is already ringing, skipping:', ringingAlarm);
      return;
    }
    
    setRingingAlarm(alarm);
    setShowNotification(true);
    setVerificationText(''); // Reset verification text
    setSliderValue(0); // Reset slider
    
    // Play sound with improved error handling
    try {
      if (audioRef.current) {
        console.log('Attempting to play alarm sound');
        
        // Reset audio to beginning just in case
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 1.0;
        
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Alarm sound playing successfully');
            })
            .catch(err => {
              console.error('❌ Error playing alarm sound:', err);
              console.log('Try clicking anywhere on the page to enable audio autoplay');
              // Still show notification even if sound fails
            });
        }
      } else {
        console.error('Audio reference is null, cannot play sound');
        
        // Try to recreate audio element if it's missing
        try {
          console.log('Attempting to recreate audio element');
          audioRef.current = new Audio(alarmSound);
          audioRef.current.loop = true;
          audioRef.current.play()
            .then(() => console.log('Recreated audio playing'))
            .catch(err => console.error('Still could not play recreated audio:', err));
        } catch (e) {
          console.error('Failed to recreate audio:', e);
        }
      }
    } catch (error) {
      console.error('Error in alarm sound playback:', error);
    }
    
    // Show notification and vibrate if available
    if ('vibrate' in navigator) {
      console.log('Activating device vibration');
      navigator.vibrate([1000, 500, 1000, 500, 1000]);
    } else {
      console.log('Vibration API not available on this device');
    }
  };
  
  // Calculate total sleep minutes from sleep history
  const calculateTotalSleepMinutes = (sleepHistory: any[]) => {
    return sleepHistory.reduce((total: number, entry: any) => {
      const [hours, minutes] = entry.duration.split(':').map(Number);
      return total + (hours * 60 + minutes);
    }, 0);
  };
  
  // Handle adding new alarm - Now uses the AlarmContext
  const handleAddAlarm = () => {
    try {
      if (useSleepTime && remainingSleepTime) {
        // Calculate alarm time based on remaining sleep time
        const now = new Date();
        const alarmDateTime = addMinutes(now, remainingSleepTime);
        const formattedTime = format(alarmDateTime, 'HH:mm');
        
        console.log('Adding sleep-based alarm at time:', formattedTime);
        addAlarm(formattedTime, 'Sleep Timer');
      } else if (alarmTime) {
        // Format the Date object to a string
        const formattedTime = format(alarmTime, 'HH:mm');
        console.log('Adding regular alarm at time:', formattedTime);
        addAlarm(formattedTime, alarmLabel || 'Alarm');
      } else {
        console.error('No alarm time selected');
        showToastMessage('অ্যালার্ম সময় নির্বাচন করুন');
        return;
      }
      
      setOpenDialog(false);
      setAlarmTime(new Date()); // Reset to current time
      setAlarmLabel('');
      setUseSleepTime(false);
      
      // Show success toast
      showToastMessage('অ্যালার্ম সেট করা হয়েছে');
      
      // Force-save alarms to localStorage
      if (alarms && Array.isArray(alarms) && alarms.length > 0) {
        console.log('Manually saving alarms after adding new alarm');
        saveAlarmsToStorage(alarms);
      }
    } catch (error) {
      console.error('Error adding alarm:', error);
      showToastMessage('অ্যালার্ম যোগ করতে সমস্যা হয়েছে');
    }
  };
  
  // Delete an alarm
  const handleDeleteAlarm = (id: string) => {
    deleteAlarm(id);
    // Show success toast
    showToastMessage('Alarm deleted');
  };
  
  // Toggle alarm active state
  const handleToggleAlarm = (id: string) => {
    toggleAlarm(id);
    
    // Get the updated alarm
    const updatedAlarm = alarms.find(alarm => alarm.id === id);
    if (updatedAlarm) {
      showToastMessage(updatedAlarm.active ? 'Alarm activated' : 'Alarm deactivated');
    }
  };
  
  // Handle text verification change
  const handleVerificationTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationText(e.target.value);
  };
  
  // Handle slider change with auto-stop when reaching 100%
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setSliderValue(value);
    
    // Auto-stop alarm when slider reaches 100% and text is correct
    if (value === 100 && verificationText === 'Alhamdulillah') {
      console.log('Slider reached 100% with correct text - stopping alarm');
      
      // Stop the ringing alarm directly here instead of calling function
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          console.log('Audio stopped successfully');
        }
      } catch (error) {
        console.error('Error stopping alarm sound:', error);
      }
      
      setRingingAlarm(null);
      setShowNotification(false);
      setVerificationText('');
      setSliderValue(0);
      
      // Stop vibration if it's available
      if ('vibrate' in navigator) {
        navigator.vibrate(0); // Stop vibration
      }
      
      showToastMessage('Alarm stopped');
    }
  };
  
  // Check if alarm can be stopped
  const canStopAlarm = () => {
    return verificationText === 'Alhamdulillah' && sliderValue === 100;
  };
  
  // Stop the ringing alarm
  const stopRingingAlarm = () => {
    if (!canStopAlarm()) {
      showToastMessage('To stop the alarm, type "Alhamdulillah" and slide to 100%');
      return;
    }
    
    console.log('Stopping alarm');
    
    // Stop the audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Reset states
    setRingingAlarm(null);
    setShowNotification(false);
    setVerificationText('');
    setSliderValue(0);
    
    showToastMessage('Alarm stopped');
  };
  
  // Show toast message
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  
  // Get time until alarm
  const getTimeUntilAlarm = (alarmTimeStr: string): string => {
    try {
      const now = new Date();
      let alarmTime = parse(alarmTimeStr, 'HH:mm', new Date());
      
      // If the alarm time has already passed today, it's for tomorrow
      if (compareAsc(alarmTime, now) < 0) {
        alarmTime = addDays(alarmTime, 1);
      }
      
      // Calculate difference in minutes
      const diffInMinutes = differenceInMinutes(alarmTime, now);
      
      // Format the remaining time
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      
      // Generate the string
      if (hours > 0) {
        return `${hours} hrs ${minutes} mins remaining`;
      } else {
        return `${minutes} mins remaining`;
      }
    } catch (error) {
      console.error('Error calculating time until alarm:', error);
      return '';
    }
  };
  
  // Create content to be displayed
  const alarmClockContent = (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="center" 
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AlarmIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Alarms
          </Typography>
        </Stack>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ 
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          Add Alarm
        </Button>
      </Stack>
      
      {alarms.length === 0 ? (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            bgcolor: isDark ? 'rgb(0,0,0)' : 'rgb(255,255,255)',
            border: '1px dashed',
            borderColor: 'divider'
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No alarms set
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={handleAddAlarm}
            sx={{ mt: 1, borderRadius: 'var(--radius-pill)' }}
          >
            Add Alarm
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <List disablePadding>
            {alarms.map((alarm, index) => (
              <ListItem 
                key={alarm.id}
                divider={index < alarms.length - 1}
                sx={{ 
                  px: 2,
                  py: 1.5,
                  bgcolor: alarm.active ? (
                    isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)'
                  ) : 'transparent',
                  transition: 'background-color 0.2s ease'
                }}
                secondaryAction={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Switch 
                      checked={alarm.active} 
                      onChange={() => toggleAlarm(alarm.id)}
                      size="small"
                      color="primary"
                    />
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => deleteAlarm(alarm.id)}
                      color="error"
                      size="small"
                      sx={{
                        bgcolor: 'error.lighter',
                        '&:hover': {
                          bgcolor: 'error.light'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="column" spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" color={alarm.active ? 'text.primary' : 'text.secondary'} sx={{ fontWeight: 600 }}>
                          {format(parse(alarm.time, 'HH:mm', new Date()), 'hh:mm a')}
                        </Typography>
                        {alarm.label.includes('Sleep') && (
                          <BedtimeIcon fontSize="small" color="primary" />
                        )}
                      </Stack>
                      
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          {alarm.label}
                        </Typography>
                        
                        {alarm.active && (
                          <Typography variant="caption" color="primary" sx={{ fontWeight: 500 }}>
                            {getTimeUntilAlarm(alarm.time)}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  }
                  sx={{
                    opacity: alarm.active ? 1 : 0.6,
                    mr: 10
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      
      {/* Add Alarm Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-md)',
            width: '100%',
            maxWidth: 400
          }
        }}
      >
        <DialogTitle>Add New Alarm</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ mb: 3, mt: 1 }}>
              <TimePicker
                label="Select Time"
                value={alarmTime}
                onChange={(newValue) => {
                  // Handle potential null value
                  if (newValue) {
                    setAlarmTime(newValue);
                  }
                }}
                sx={{ width: '100%' }}
                views={['hours', 'minutes']}
                ampm={true}
                minutesStep={1} // Allow selecting every minute
                closeOnSelect={false}
              />
            </Box>
          </LocalizationProvider>
          
          <TextField
            fullWidth
            label="Label"
            value={alarmLabel}
            onChange={(e) => setAlarmLabel(e.target.value)}
            margin="normal"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            color="inherit"
            variant="text"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddAlarm} 
            variant="contained"
            color="primary"
            startIcon={<CheckIcon />}
            disabled={!alarmTime} // Disable if no time selected
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Alarm Notification Dialog */}
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
            Alarm Ringing!
          </Typography>
        </Box>
        
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
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
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            Your alarm time has arrived. Please type "Alhamdulillah" and slide to stop.
          </Typography>
          
          {/* Verification Text Input */}
          <TextField
            fullWidth
            label="Type 'Alhamdulillah'"
            variant="outlined"
            value={verificationText}
            onChange={handleVerificationTextChange}
            error={verificationText !== '' && verificationText !== 'Alhamdulillah'}
            helperText={verificationText !== '' && verificationText !== 'Alhamdulillah' ? 'Must type exactly "Alhamdulillah"' : ''}
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
            {/* Sliding track for progress indication */}
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
            
            {/* Slider track label */}
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
              <SwipeRightAltIcon /> Slide to stop
            </Typography>
            
            {/* Actual slider component (invisible but functional) */}
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              aria-labelledby="alarm-stop-slider"
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                padding: 0,
                opacity: 0, // Make slider invisible but functional
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
            
            {/* Thumb indicator that moves with the slider */}
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
              ? "Alarm stopped" 
              : verificationText === 'Alhamdulillah' 
                ? "Complete both actions above to stop the alarm" 
                : "First type 'Alhamdulillah' and then slide to 100%"}
          </Typography>
        </DialogContent>
      </Dialog>
      
      {/* Toast Notification */}
      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        TransitionComponent={Fade}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );

  // Return differently based on if it's modal or not
  if (isModal) {
    return (
      <Dialog 
        open={true} 
        onClose={onClose}
        fullWidth
        maxWidth="md"
        TransitionComponent={SlideTransition as any}
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-md)',
            maxHeight: '90vh',
            bgcolor: isDark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Alarm Clock</Typography>
          {onClose && (
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          {alarmClockContent}
        </DialogContent>
      </Dialog>
    );
  }
  
  // Return as normal page
  return alarmClockContent;
};

export default AlarmClock; 