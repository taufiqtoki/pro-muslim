import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  TextField, 
  Box, 
  Button, 
  Grid, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tooltip,
  Paper,
  Slider,
  InputAdornment,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme as useMuiTheme,
  useMediaQuery
} from '@mui/material';
import { differenceInMinutes, addDays, parse, format, startOfDay, isAfter, isBefore, setHours, addMinutes } from 'date-fns';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimerIcon from '@mui/icons-material/Timer';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTheme } from '../../contexts/ThemeContext.tsx';

// Define new interface for daily sleep records
interface DailySleepRecord {
  date: string; // YYYY-MM-DD format
  totalMinutes: number;
  entries: SleepEntry[];
}

// Define interface for individual sleep entries
interface SleepEntry {
  id: string;
  start: string; // HH:MM format
  end: string; // HH:MM format
  duration: string; // HH:MM format
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
}

const SleepTracker: React.FC = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const isWideEnough = useMediaQuery('(min-width:400px)');
  const [startTime, setStartTime] = useState<string>('22:30');
  const [endTime, setEndTime] = useState<string>('05:30');
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [displayTime, setDisplayTime] = useState<string>('00:00');
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [sleepHistory, setSleepHistory] = useState<SleepEntry[]>([]);
  const [dailySleepRecords, setDailySleepRecords] = useState<DailySleepRecord[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [targetMinutes, setTargetMinutes] = useState<number>(300); // Default 5 hours
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newTargetMinutes, setNewTargetMinutes] = useState<number>(300); // For input form

  // Constants
  const DAY_RESET_HOUR = 20; // 8 PM

  useEffect(() => {
    // Load sleep data and settings from localStorage
    const storedHistory = localStorage.getItem('sleepHistory');
    const storedTarget = localStorage.getItem('sleepTarget');
    
    if (storedTarget) {
      setTargetMinutes(parseInt(storedTarget));
    }
    
    if (storedHistory) {
      try {
        const history = JSON.parse(storedHistory) as SleepEntry[];
      setSleepHistory(history);
        
        // Process and group sleep entries by day (8 PM to 8 PM)
        const groupedRecords = groupSleepEntriesByDay(history);
        setDailySleepRecords(groupedRecords);
        
        // Calculate total minutes for today
        const today = getCurrentSleepDay();
        const todayRecord = groupedRecords.find(record => record.date === today);
        
        if (todayRecord) {
          setTotalMinutes(todayRecord.totalMinutes);
          setDisplayTime(formatTime(todayRecord.totalMinutes));
        } else {
          setTotalMinutes(0);
          setDisplayTime('00:00');
        }
      } catch (error) {
        console.error('Error loading sleep history:', error);
      }
    }
  }, []);

  // Ensure new target state is synced with target minutes on load
  useEffect(() => {
    setNewTargetMinutes(targetMinutes);
  }, [targetMinutes]);

  const handleAddSleep = () => {
    if (!startTime || !endTime) return;
    
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    // Parse start and end times
    const startDateTime = parse(`${today} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    let endDateTime = parse(`${today} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
    
    // Handle overnight sleep or identical times
    // If end time is before or equal to start time, assume it's the next day
    if (isBefore(endDateTime, startDateTime) || startTime === endTime) {
      const tomorrow = addDays(now, 1);
      endDateTime = parse(`${format(tomorrow, 'yyyy-MM-dd')} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
    }
    
    // Calculate duration in minutes
    const minutes = differenceInMinutes(endDateTime, startDateTime);
    
    // Ensure we have at least 1 minute difference for identical times
    const adjustedMinutes = minutes === 0 ? 
      (startTime === endTime ? 24 * 60 : 1) : // 24 hours if times are identical
      minutes;
    
    // Create new sleep entry
    const newEntry: SleepEntry = {
      id: Date.now().toString(),
      start: startTime,
      end: endTime,
      duration: formatTime(adjustedMinutes),
      startDate: format(startDateTime, 'yyyy-MM-dd'),
      endDate: format(endDateTime, 'yyyy-MM-dd')
    };
    
    let updatedHistory: SleepEntry[];
    
    if (editIndex !== null) {
      // Update existing entry
      updatedHistory = [...sleepHistory];
      updatedHistory[editIndex] = newEntry;
      setEditIndex(null);
    } else {
      // Add new entry
      updatedHistory = [...sleepHistory, newEntry];
    }
    
    setSleepHistory(updatedHistory);
    
    // Update grouped records
    const groupedRecords = groupSleepEntriesByDay(updatedHistory);
    setDailySleepRecords(groupedRecords);
    
    // Update total minutes for today
    const currentDay = getCurrentSleepDay();
    const todayRecord = groupedRecords.find(record => record.date === currentDay);
    
    if (todayRecord) {
      setTotalMinutes(todayRecord.totalMinutes);
      setDisplayTime(formatTime(todayRecord.totalMinutes));
    }

    setStartTime('');
    setEndTime('');

    // Save to localStorage
    localStorage.setItem('sleepHistory', JSON.stringify(updatedHistory));
  };

  const handleEdit = (entryId: string) => {
    const entryIndex = sleepHistory.findIndex(entry => entry.id === entryId);
    
    if (entryIndex !== -1) {
      const entry = sleepHistory[entryIndex];
    setStartTime(entry.start);
    setEndTime(entry.end);
      setEditIndex(entryIndex);
    setHistoryOpen(false);
    }
  };

  const handleDelete = (entryId: string) => {
    const entryIndex = sleepHistory.findIndex(entry => entry.id === entryId);
    
    if (entryIndex !== -1) {
      const updatedHistory = sleepHistory.filter((_, i) => i !== entryIndex);
    setSleepHistory(updatedHistory);

      // Update grouped records
      const groupedRecords = groupSleepEntriesByDay(updatedHistory);
      setDailySleepRecords(groupedRecords);
      
      // Update total minutes for today
      const today = getCurrentSleepDay();
      const todayRecord = groupedRecords.find(record => record.date === today);
      
      if (todayRecord) {
        setTotalMinutes(todayRecord.totalMinutes);
        setDisplayTime(formatTime(todayRecord.totalMinutes));
      } else {
        setTotalMinutes(0);
        setDisplayTime('00:00');
      }
      
      // Save to localStorage
    localStorage.setItem('sleepHistory', JSON.stringify(updatedHistory));
    }
  };
  
  const handleSaveTarget = () => {
    setTargetMinutes(newTargetMinutes);
    localStorage.setItem('sleepTarget', newTargetMinutes.toString());
    setSettingsOpen(false);
  };

  const parseDuration = (duration: string) => {
    try {
      // Check if duration is in HH:MM format
      if (duration.includes(':')) {
    const [hours, minutes] = duration.split(':').map(Number);
        // Handle invalid values
        if (isNaN(hours) || isNaN(minutes)) {
          console.error('Invalid duration format:', duration);
          return 0;
        }
        return (hours * 60) + minutes;
      } else {
        // Try to parse as a number directly
        const mins = parseInt(duration, 10);
        return isNaN(mins) ? 0 : mins;
      }
    } catch (error) {
      console.error('Error parsing duration:', error);
      return 0;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Convert total minutes to human-readable text
  const getHumanReadableSleepTime = (mins: number = totalMinutes) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hours`;
    } else {
      return `${hours} hours ${minutes} minutes`;
    }
  };

  // Get sleep quality assessment
  const getSleepQuality = (mins: number = totalMinutes) => {
    if (mins < 240) {
      return { text: 'Insufficient', color: '#FF3B30' }; // less than 4 hours - insufficient
    } else if (mins < 270) {
      return { text: 'Fair', color: '#FF9500' }; // 4 to 4.5 hours - fair
    } else if (mins < 300) {
      return { text: 'Good', color: '#34C759' }; // 4.5 to 5 hours - good
    } else if (mins > 330) {
      return { text: 'Excessive', color: '#FF9500' }; // more than 5.5 hours - excessive
    } else {
      return { text: 'Perfect', color: '#34C759' }; // 5 to 5.5 hours - perfect
    }
  };

  // Calculate remaining sleep time for the target
  const getRemainingTime = (mins: number = totalMinutes) => {
    if (mins >= targetMinutes) {
      return { text: 'Completed', color: '#34C759', minutes: 0 };
    } else {
      const remainingMinutes = targetMinutes - mins;
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      
      const text = hours > 0 
        ? `${hours}h ${minutes}m left` 
        : `${minutes}m left`;
      
      return { text, color: '#FF9500', minutes: remainingMinutes };
    }
  };

  const getLastSleepTime = () => {
    if (sleepHistory.length === 0) return null;
    
    const lastEntry = sleepHistory[sleepHistory.length - 1];
    return lastEntry;
  };

  // Get the current "sleep day" (today until 8 PM, yesterday after 8 PM)
  const getCurrentSleepDay = (): string => {
    const now = new Date();
    const resetHour = DAY_RESET_HOUR;
    
    // If it's before 8 PM, use yesterday's date
    if (now.getHours() < resetHour) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return format(yesterday, 'yyyy-MM-dd');
    }
    
    return format(now, 'yyyy-MM-dd');
  };
  
  // Group sleep entries by day (8 PM to 8 PM)
  const groupSleepEntriesByDay = (entries: SleepEntry[]): DailySleepRecord[] => {
    const groupedEntries: { [date: string]: SleepEntry[] } = {};
    
    // Group entries by their sleep day (based on start time)
    entries.forEach(entry => {
      // Make sure we have valid dates
      if (!entry.startDate) {
        console.warn('Entry missing startDate, using current date', entry);
        entry.startDate = format(new Date(), 'yyyy-MM-dd');
      }
      
      // Use the entry's existing startDate (already determined when entry was created)
      // For backwards compatibility check if startDate exists
      const sleepDay = entry.startDate;
      
      if (!groupedEntries[sleepDay]) {
        groupedEntries[sleepDay] = [];
      }
      
      groupedEntries[sleepDay].push(entry);
    });
    
    // Convert to array of DailySleepRecord
    return Object.keys(groupedEntries).map(date => {
      const dayEntries = groupedEntries[date];
      
      // Calculate total minutes from all entries for this day
      const totalMinutes = dayEntries.reduce((total, entry) => {
        // Make sure we have valid duration
        if (!entry.duration) {
          console.warn('Entry missing duration', entry);
          return total;
        }
        
        // Parse the duration and add to total
        const durationMinutes = parseDuration(entry.duration);
        return total + durationMinutes;
      }, 0);
      
      return {
        date,
        entries: dayEntries,
        totalMinutes
      };
    }).sort((a, b) => {
      // Sort by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  };
  
  // Determine the sleep day based on date and time
  const getSleepDayFromDateAndTime = (dateStr: string, timeStr: string): string => {
    try {
      // Make sure we have a valid date
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        // If date is invalid, use today's date
        const now = new Date();
        return format(now, 'yyyy-MM-dd');
      }
      
      // Parse the hours and minutes
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      // Create a new date with correct hours and minutes
      const date = new Date(dateStr);
      date.setHours(hours, minutes, 0, 0);
      
      // If time is before DAY_RESET_HOUR, it belongs to previous day
      // This is correct for normal sleep tracking (sleep starting before cutoff belongs to previous day)
      if (hours < DAY_RESET_HOUR) {
        // No date change needed - the date already represents the correct sleep day
        return format(date, 'yyyy-MM-dd');
      } else {
        // After cutoff hour, the sleep belongs to this day
        return format(date, 'yyyy-MM-dd');
      }
    } catch (error) {
      console.error('Error in getSleepDayFromDateAndTime:', error);
      // Return today's date as fallback
      return format(new Date(), 'yyyy-MM-dd');
    }
  };
  
  // Helper to get date from time string using current date
  const getDateFromTimeString = (timeStr: string): string => {
    const now = new Date();
    // Always return today's actual date, without any logic about sleep days
    return format(now, 'yyyy-MM-dd');
  };
  
  // Calculate average sleep time per day
  const getAverageSleepTime = (): number => {
    if (dailySleepRecords.length === 0) return 0;
    
    const totalMinutes = dailySleepRecords.reduce((total, record) => {
      return total + record.totalMinutes;
    }, 0);
    
    return Math.round(totalMinutes / dailySleepRecords.length);
  };
  
  // Get completion percentage toward target
  const getCompletionPercentage = (minutes: number): number => {
    return Math.min(100, Math.round((minutes / targetMinutes) * 100));
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return format(date, 'EEE, MMM d, yyyy');
  };
  
  // Get current day's sleep record
  const getCurrentDayRecord = (): DailySleepRecord | undefined => {
    const today = getCurrentSleepDay();
    return dailySleepRecords.find(record => record.date === today);
  };

  // Sleep history modal functions
  const handleOpenHistory = () => {
    setHistoryOpen(true);
  };

  const handleCloseHistory = () => {
    setHistoryOpen(false);
  };

  // Calculate average daily sleep
  const getAverageSleepPerDay = (): number => {
    if (dailySleepRecords.length === 0) return 0;
    
    const totalSleep = dailySleepRecords.reduce((sum, record) => sum + record.totalMinutes, 0);
    return Math.round(totalSleep / dailySleepRecords.length);
  };
  
  // Update target minutes
  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setNewTargetMinutes(value);
    }
  };

  // Add handler for resetting inputs
  const handleResetInputs = () => {
    setStartTime('');
    setEndTime('');
    setEditIndex(null);
  };

  // Add handler for deleting a day record
  const handleDeleteDay = (date: string) => {
    // Filter out all entries for this day (using startDate)
    const filteredHistory = sleepHistory.filter(entry => {
      return entry.startDate !== date;
    });
    
    setSleepHistory(filteredHistory);
    
    // Update grouped records
    const groupedRecords = groupSleepEntriesByDay(filteredHistory);
    setDailySleepRecords(groupedRecords);
    
    // Update total minutes for today if we deleted today
    const today = format(new Date(), 'yyyy-MM-dd');
    if (date === today) {
      setTotalMinutes(0);
      setDisplayTime('00:00');
    }
    
    // Save to localStorage
    localStorage.setItem('sleepHistory', JSON.stringify(filteredHistory));
  };

  return (
    <Box sx={{ position: 'relative', mb: 2 }}>
      {/* Compact View - New Horizontal Design */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 2,
          background: isDark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          pt: 0.5,
          pb: 0.5,
          overflow: 'hidden'
        }}
      >
        {/* Header with Title and Sleep Quality */}
        <Stack 
          direction="row" 
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 0.5, width: '100%', px: { xs: 1, sm: 1.5 } }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}> 
            <BedtimeIcon 
              color="primary" 
              fontSize="small" 
              sx={{ 
                animation: totalMinutes > 0 ? 'pulse 1.5s infinite ease-in-out' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.6 }
                },
                fontSize: '1.1rem'
              }} 
            />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Sleep | {getHumanReadableSleepTime()}
        </Typography>
          </Stack>
          
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip 
              label={getSleepQuality().text}
              size="small"
              sx={{ 
                height: 20,
                fontSize: '0.65rem',
                color: getSleepQuality().color,
                bgcolor: isDark ? 'rgb(0,0,0)' : 'white',
                fontWeight: 600
              }}
            />
            <IconButton
              size="small"
              onClick={handleOpenHistory}
              sx={{ 
                p: 0.5,
                color: 'primary.main',
                width: 24,
                height: 24,
                bgcolor: isDark ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(var(--primary-rgb), 0.05)',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(var(--primary-rgb), 0.1)'
                }
              }}
            >
              <HistoryIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
          </Stack>
        </Stack>
        
        {/* Main Content - Time Input Controls - Responsive Layout (Based on 350px) */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: isWideEnough ? 'row' : 'column',
            alignItems: isWideEnough ? 'center' : 'stretch', 
            justifyContent: 'space-between',
            gap: { xs: 0.75, sm: 1 }, 
            mb: 0.75, 
            width: '100%',
            px: { xs: 1, sm: 1.5 }
          }}
        >
          {/* Time Controls Block */}
          <Box sx={{ 
              width: isWideEnough ? 'auto' : '100%',
              flexGrow: isWideEnough ? 1 : 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 0.75, sm: 0.75 }
          }}>
            {/* Start Time TextField */} 
            <Box sx={{ position: 'relative', flexGrow: 1 }}>
          <TextField
                placeholder="Start"
            type="time"
                size="small"
            fullWidth
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
                sx={{ 
                  "& .MuiInputBase-root": { height: 32 },
                  "& .MuiInputBase-input": { py: 0.4, px: 0.75 }
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: -8,
                  left: 8,
                  backgroundColor: isDark ? 'rgb(0, 0, 0)' : 'white',
                  px: 0.5,
                  fontSize: '0.7rem',
                  color: 'text.secondary'
                }}
              >
                Start
              </Typography>
            </Box>
            
            {/* End Time TextField */} 
            <Box sx={{ position: 'relative', flexGrow: 1 }}>
          <TextField
                placeholder="End"
            type="time"
                size="small"
            fullWidth
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
                sx={{ 
                  "& .MuiInputBase-root": { height: 32 },
                  "& .MuiInputBase-input": { py: 0.4, px: 0.75 }
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: -8,
                  left: 8,
                  backgroundColor: isDark ? 'rgb(0, 0, 0)' : 'white',
                  px: 0.5,
                  fontSize: '0.7rem',
                  color: 'text.secondary'
                }}
              >
                End
        </Typography>
            </Box>
          </Box>
          
          {/* Action Buttons Block */}
          <Stack 
            direction="row" 
            spacing={{ xs: 0.75, sm: 0.75 }}
            sx={{ 
              width: isWideEnough ? 'auto' : '100%',
              justifyContent: isWideEnough ? 'flex-end' : 'center',
              mt: isWideEnough ? 0 : 1
            }}
          >
            {/* Reset IconButton */} 
            <Tooltip title="Reset inputs">
              <IconButton
                size="small"
                onClick={handleResetInputs}
                sx={{ 
                  height: { xs: 30, sm: 30 },
                  width: { xs: 30, sm: 30 },
                  color: 'text.secondary',
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
              >
                <RestartAltIcon sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Tooltip>
            
            {/* Add/Update Button */} 
          <Button 
            variant="contained" 
            onClick={handleAddSleep}
            disabled={!startTime || !endTime}
            size="small"
            sx={{ 
              minWidth: 'auto',
                height: 32,
                px: { xs: 1.5, sm: 1.5 },
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              borderRadius: 'var(--radius-md)'
            }}
          >
            {editIndex !== null ? 'Update' : 'Add'}
          </Button>
          </Stack>
      </Box>

        {/* Quick Action Links */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '0.7rem', 
          color: 'text.secondary',
          gap: 0.5,
          width: '100%',
          px: { xs: 1, sm: 1.5 },
          mb: 0
        }}>
          <Box 
            component="span" 
            onClick={() => {
              const now = new Date();
              const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              setStartTime(timeString);
            }}
            sx={{ 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              p: 0.3,
              px: 0.7,
              borderRadius: 'var(--radius-md)',
              '&:hover': { 
                color: 'primary.main',
                bgcolor: isDark ? 'rgb(0,0,0)' : 'rgba(0,0,0,0.1)'
              },
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                display: 'inline-block'
              }}
            />
            Now as start
          </Box>
          
          {/* Completed text between buttons */}
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.3,
              p: 0.3,
              px: 0.7,
              borderRadius: 'var(--radius-md)',
              color: getRemainingTime().minutes > 0 ? getRemainingTime().color : 'success.main',
              fontWeight: 600,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 'max-content'
            }}
          >
            <Tooltip title="5 hours of sleep is recommended highest target" arrow>
              <InfoOutlinedIcon sx={{ fontSize: '0.85rem', cursor: 'help' }} />
            </Tooltip>
            {getRemainingTime().minutes > 0 ? getRemainingTime().text : 'Completed'}
          </Box>
          
          <Box 
            component="span" 
            onClick={() => {
              const now = new Date();
              const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              setEndTime(timeString);
            }}
            sx={{ 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              p: 0.3,
              px: 0.7,
              borderRadius: 'var(--radius-md)',
              '&:hover': { 
                color: 'error.main',
                bgcolor: isDark ? 'rgb(0,0,0)' : 'rgba(0,0,0,0.1)'
              },
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'error.main',
                display: 'inline-block'
              }}
            />
            Now as end
          </Box>
        </Box>
      </Paper>

      {/* Enhanced History Modal */}
      <Dialog 
        open={historyOpen} 
        onClose={handleCloseHistory}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-lg)',
            background: isDark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 1.5,
          pt: 2,
          px: { xs: 1.5, sm: 3 }
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <BedtimeIcon color="primary" sx={{ fontSize: '1.5rem' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Sleep History</Typography>
            </Stack>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={`Today: ${getHumanReadableSleepTime()}`}
                size="small"
                color="primary"
                sx={{ 
                  height: 24, 
                  fontWeight: 500,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '& .MuiChip-label': { px: 1 }
                }}
              />
          <IconButton
                size="small" 
                onClick={handleCloseHistory}
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
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: { xs: 1.5, sm: 3 } }}>
          <Box mb={2}>
            <Stack spacing={2.5}>
              {/* Sleep statistics and daily goal in a single row */}
              <Grid container spacing={1} sx={{ maxHeight: '70px', minHeight: '50px', overflow: 'hidden' }}>
                {/* Sleep Statistics - 40% width */}
                <Grid item xs={12} md={5}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 0.75,
                      height: '100%',
                      bgcolor: isDark ? 'rgb(0,0,0)' : 'rgb(255,255,255)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ height: '100%' }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '28%' }}>
                        <CalendarTodayIcon color="primary" sx={{ fontSize: '0.9rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8rem' }}>
                          {dailySleepRecords.length}
                        </Typography>
                      </Stack>
                      
                      <Divider orientation="vertical" flexItem sx={{ height: '70%' }} />
                      
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '68%' }}>
                        <TimerIcon color="primary" sx={{ fontSize: '0.9rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.85rem' }}>
                          {Math.floor(getAverageSleepPerDay() / 60)}:{(getAverageSleepPerDay() % 60).toString().padStart(2, '0')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', ml: 0.5 }}>
                          avg/day
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
                
                {/* Target setting - 60% width */}
                <Grid item xs={12} md={7}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 0.75,
                      height: '100%',
                      bgcolor: isDark ? 'rgb(0,0,0)' : 'rgb(255,255,255)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Stack 
                      direction="row" 
                      spacing={{ xs: 0.5, sm: 1 }} 
                      alignItems="center" 
                      justifyContent="space-between"
                      sx={{ width: '100%', px: { xs: 0.25, sm: 0.5 } }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: { xs: '12%', sm: '15%' } }}>
                        <SettingsIcon color="primary" fontSize="small" sx={{ fontSize: '0.9rem' }} />
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, fontSize: '0.75rem', display: { xs: 'none', sm: 'block' } }}>
                          Goal:
            </Typography>
                      </Stack>
                      
                      <TextField
                        placeholder="Minutes"
                        type="number"
                        value={newTargetMinutes}
                        onChange={handleTargetChange}
                        size="small"
                        sx={{ 
                          width: { xs: '33%', sm: '30%' },
                          "& .MuiInputBase-root": { height: 30, fontSize: '0.8rem' }
                        }}
                        InputProps={{
                          endAdornment: (
                            <Box component="span" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                              min
              </Box>
                          ),
                        }}
                      />
                      
                      <Box sx={{ width: { xs: '30%', sm: '25%' }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {Math.floor(newTargetMinutes / 60)}h {newTargetMinutes % 60}m
            </Typography>
          </Box>
                      
                      <Box sx={{ width: { xs: '23%', sm: '25%' }, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="contained" 
                          onClick={handleSaveTarget}
                          size="small"
                          sx={{ minWidth: { xs: 40, sm: 50 }, height: 28, fontSize: '0.75rem', width: { xs: '95%', sm: '90%' } }}
                        >
                          Save
                        </Button>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
              
              {/* Day-wise sleep records with accordion expansion */}
              {dailySleepRecords.length > 0 ? (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: { xs: 1.5, sm: 2.5 },
                    bgcolor: isDark ? 'rgb(0,0,0)' : 'rgb(255,255,255)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <HistoryIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
                        Sleep Entries by Day
                      </Typography>
                    </Stack>
                    
                    <Stack spacing={1.5}>
                      {dailySleepRecords.map((record) => (
                        <Accordion 
                          key={record.date} 
                          disableGutters 
                          elevation={0}
                          sx={{
                            bgcolor: 'transparent',
                            '&:before': { display: 'none' },
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            mb: 0.5
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
                            sx={{
                              px: { xs: 1, sm: 2 },
                              py: 0.75,
                              borderTopLeftRadius: 'var(--radius-md)',
                              borderTopRightRadius: 'var(--radius-md)',
                              bgcolor: isDark ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.02)',
                              '&:hover': {
                                bgcolor: isDark ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)'
                              }
                            }}
                          >
                            <Stack 
                              direction="row" 
                              justifyContent="space-between" 
                              alignItems="center" 
                              sx={{ width: '100%', pr: { xs: 0, sm: 1 } }}
                            >
                              <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center">
                                <BedtimeIcon 
                                  fontSize="small" 
                                  sx={{ 
                                    color: getSleepQuality(record.totalMinutes).color,
                                    fontSize: '1.1rem'
                                  }} 
                                />
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {formatDate(record.date)}
                </Typography>
                              </Stack>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                                <Chip 
                                  size="small"
                                  label={getHumanReadableSleepTime(record.totalMinutes)}
                                  sx={{ 
                                    height: { xs: 20, sm: 22 },
                                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                                    bgcolor: getSleepQuality(record.totalMinutes).color + '20',
                                    color: getSleepQuality(record.totalMinutes).color,
                                    fontWeight: 600,
                                    '& .MuiChip-label': { px: { xs: 0.5, sm: 1 } }
                                  }}
                                />
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDay(record.date);
                                  }}
                                  sx={{ 
                                    color: 'error.main',
                                    p: 0.5,
                                    bgcolor: 'rgba(255,0,0,0.05)',
                                    width: 24,
                                    height: 24,
                                    '&:hover': { bgcolor: 'rgba(255,0,0,0.1)' }
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                                </IconButton>
                              </Box>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0, bgcolor: 'transparent' }}>
                            <Box sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
                              <Stack spacing={1}>
                                {record.entries.map((entry) => (
                                  <Paper 
                                    key={entry.id} 
                                    elevation={0}
                                    sx={{ 
                                      p: { xs: 0.75, sm: 1 },
                                      pl: { xs: 1, sm: 1.5 }, 
                                      borderRadius: 'var(--radius-md)',
                                      bgcolor: isDark ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.02)',
                                      borderLeft: '3px solid',
                                      borderColor: getSleepQuality(parseDuration(entry.duration)).color
                                    }}
                                  >
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                      <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
                                        <Box>
                                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                                            {format(new Date(entry.startDate), 'h:mm a')} - {format(new Date(entry.endDate), 'h:mm a')}
                                          </Typography>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TimerIcon sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                                              {Math.floor(parseDuration(entry.duration) / 60)}h {parseDuration(entry.duration) % 60}m
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Stack>
                                      
                                      <Box sx={{ display: 'flex', gap: { xs: 0.3, sm: 0.5 } }}>
                      <IconButton 
                        size="small" 
                                          onClick={() => handleEdit(entry.id)}
                        sx={{ 
                                            p: { xs: 0.3, sm: 0.5 },
                          color: 'primary.main',
                                            width: { xs: 20, sm: 24 },
                                            height: { xs: 20, sm: 24 },
                                            bgcolor: 'rgba(var(--primary-rgb), 0.1)',
                                            '&:hover': { bgcolor: 'rgba(var(--primary-rgb), 0.2)' }
                        }}
                      >
                                          <EditIcon sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }} />
                  </IconButton>
                      <IconButton 
                        size="small" 
                                          onClick={() => handleDelete(entry.id)}
                                          sx={{ 
                                            p: { xs: 0.3, sm: 0.5 },
                                            color: 'error.main',
                                            width: { xs: 20, sm: 24 },
                                            height: { xs: 20, sm: 24 },
                                            bgcolor: 'rgba(255,0,0,0.1)',
                                            '&:hover': { bgcolor: 'rgba(255,0,0,0.2)' }
                                          }}
                                        >
                                          <DeleteIcon sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }} />
                  </IconButton>
                                      </Box>
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              ) : (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 4,
                    bgcolor: isDark ? 'rgb(0,0,0)' : 'rgb(255,255,255)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <BedtimeIcon sx={{ fontSize: '3rem', color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                  <Typography color="text.secondary">No sleep history found</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Add your sleep times to start tracking
              </Typography>
                </Paper>
              )}
              
              {/* Add space at bottom */}
              <Box sx={{ height: 16 }} />
            </Stack>
            </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SleepTracker;
