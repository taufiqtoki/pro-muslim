import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AlarmIcon from '@mui/icons-material/Alarm';
import CloseIcon from '@mui/icons-material/Close';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useTheme } from '../contexts/ThemeContext';
import { format, addMinutes, parse } from 'date-fns';

interface Alarm {
  id: string;
  time: string;
  label: string;
  active: boolean;
}

const AlarmClock: React.FC = () => {
  const { isDark } = useTheme();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmLabel, setAlarmLabel] = useState('');
  const [remainingSleepTime, setRemainingSleepTime] = useState<number | null>(null);
  const [useSleepTime, setUseSleepTime] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Load alarms from local storage on initial render
  useEffect(() => {
    const storedAlarms = localStorage.getItem('alarms');
    if (storedAlarms) {
      setAlarms(JSON.parse(storedAlarms));
    }
    
    // Try to get remaining sleep time from local storage
    const sleepHistoryStr = localStorage.getItem('sleepHistory');
    if (sleepHistoryStr) {
      try {
        const sleepHistory = JSON.parse(sleepHistoryStr);
        const totalMinutesSlept = calculateTotalSleepMinutes(sleepHistory);
        const targetSleepMinutes = 300; // 5 hours in minutes
        
        if (totalMinutesSlept < targetSleepMinutes) {
          setRemainingSleepTime(targetSleepMinutes - totalMinutesSlept);
        }
      } catch (error) {
        console.error('Error parsing sleep history:', error);
      }
    }
    
    // Check for alarms going off
    const intervalId = setInterval(checkAlarms, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Save alarms to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('alarms', JSON.stringify(alarms));
  }, [alarms]);
  
  // Calculate total sleep minutes from sleep history
  const calculateTotalSleepMinutes = (sleepHistory: any[]) => {
    return sleepHistory.reduce((total: number, entry: any) => {
      const [hours, minutes] = entry.duration.split(':').map(Number);
      return total + (hours * 60 + minutes);
    }, 0);
  };
  
  // Handle adding new alarm
  const handleAddAlarm = () => {
    if (useSleepTime && remainingSleepTime) {
      // Calculate alarm time based on remaining sleep time
      const now = new Date();
      const alarmDateTime = addMinutes(now, remainingSleepTime);
      const formattedTime = format(alarmDateTime, 'HH:mm');
      
      addNewAlarm(formattedTime, 'Sleep Timer');
    } else if (alarmTime) {
      addNewAlarm(alarmTime, alarmLabel || 'Alarm');
    }
    
    setOpenDialog(false);
    setAlarmTime('');
    setAlarmLabel('');
    setUseSleepTime(false);
  };
  
  // Add new alarm to the list
  const addNewAlarm = (time: string, label: string) => {
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time,
      label,
      active: true
    };
    
    setAlarms(prevAlarms => [...prevAlarms, newAlarm]);
    showAlert(`অ্যালার্ম সেট করা হয়েছে: ${format(parse(time, 'HH:mm', new Date()), 'hh:mm a')}`);
  };
  
  // Delete an alarm
  const handleDeleteAlarm = (id: string) => {
    setAlarms(prevAlarms => prevAlarms.filter(alarm => alarm.id !== id));
    showAlert('অ্যালার্ম মুছে ফেলা হয়েছে');
  };
  
  // Toggle alarm active state
  const handleToggleAlarm = (id: string) => {
    setAlarms(prevAlarms => 
      prevAlarms.map(alarm => 
        alarm.id === id ? { ...alarm, active: !alarm.active } : alarm
      )
    );
  };
  
  // Check if any alarms should go off
  const checkAlarms = () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    
    alarms.forEach(alarm => {
      if (alarm.active && alarm.time === currentTime) {
        // In a real implementation, we would play a sound here
        alert(`অ্যালার্ম বাজছে: ${alarm.label}`);
        
        // Deactivate the alarm after it goes off
        handleToggleAlarm(alarm.id);
      }
    });
  };
  
  // Show alert message
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertVisible(true);
    
    setTimeout(() => {
      setAlertVisible(false);
    }, 3000);
  };
  
  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="center" 
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AlarmIcon color="primary" />
          <Typography variant="h6" component="h1">
            অ্যালার্ম ক্লক
          </Typography>
        </Stack>
        
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 'var(--radius-pill)' }}
        >
          নতুন অ্যালার্ম
        </Button>
      </Stack>
      
      {alertVisible && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setAlertVisible(false)}
        >
          {alertMessage}
        </Alert>
      )}
      
      {alarms.length === 0 ? (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
            border: '1px dashed',
            borderColor: 'divider'
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            কোন অ্যালার্ম সেট করা হয়নি।
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            "নতুন অ্যালার্ম" বাটনে ক্লিক করে অ্যালার্ম যোগ করুন।
          </Typography>
        </Paper>
      ) : (
        <List sx={{ 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden'
        }}>
          {alarms.map((alarm, index) => (
            <ListItem 
              key={alarm.id}
              divider={index < alarms.length - 1}
              secondaryAction={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Switch 
                    checked={alarm.active} 
                    onChange={() => handleToggleAlarm(alarm.id)}
                    size="small"
                  />
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => handleDeleteAlarm(alarm.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" color={alarm.active ? 'text.primary' : 'text.secondary'}>
                      {format(parse(alarm.time, 'HH:mm', new Date()), 'hh:mm a')}
                    </Typography>
                    {alarm.label.includes('Sleep') && (
                      <BedtimeIcon fontSize="small" color="primary" />
                    )}
                  </Stack>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {alarm.label}
                  </Typography>
                }
                sx={{
                  opacity: alarm.active ? 1 : 0.6
                }}
              />
            </ListItem>
          ))}
        </List>
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
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">নতুন অ্যালার্ম</Typography>
            <IconButton 
              aria-label="close" 
              onClick={() => setOpenDialog(false)}
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          {remainingSleepTime && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Switch 
                  checked={useSleepTime} 
                  onChange={(e) => setUseSleepTime(e.target.checked)} 
                />
                <Typography variant="body2">
                  আপনার অবশিষ্ট ঘুমের সময় ব্যবহার করুন ({Math.floor(remainingSleepTime / 60)}h {remainingSleepTime % 60}m)
                </Typography>
              </Stack>
              <Chip 
                icon={<BedtimeIcon />} 
                label={`5 ঘন্টা ঘুম পূর্ণ করতে এই অ্যালার্ম ব্যবহার করুন`}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ mt: 1 }}
              />
            </Box>
          )}
          
          {!useSleepTime && (
            <>
              <TextField
                autoFocus
                margin="dense"
                label="সময় নির্ধারণ করুন"
                type="time"
                fullWidth
                variant="outlined"
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
                sx={{ mb: 2 }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              
              <TextField
                margin="dense"
                label="লেবেল (ঐচ্ছিক)"
                type="text"
                fullWidth
                variant="outlined"
                value={alarmLabel}
                onChange={(e) => setAlarmLabel(e.target.value)}
                placeholder="অ্যালার্ম এর নাম লিখুন"
              />
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            বাতিল
          </Button>
          <Button 
            onClick={handleAddAlarm} 
            variant="contained"
            disabled={!useSleepTime && !alarmTime}
          >
            সেভ করুন
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlarmClock; 