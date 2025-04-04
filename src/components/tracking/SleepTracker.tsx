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
  Paper
} from '@mui/material';
import { differenceInMinutes, addDays, parse, format } from 'date-fns';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const SleepTracker: React.FC = () => {
  const { isDark } = useTheme();
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [displayTime, setDisplayTime] = useState<string>('00:00');
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [sleepHistory, setSleepHistory] = useState<{ start: string, end: string, duration: string }[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    const storedHistory = localStorage.getItem('sleepHistory');
    if (storedHistory) {
      const history = JSON.parse(storedHistory);
      setSleepHistory(history);
      const totalMinutes = history.reduce((acc: number, entry: { duration: string }) => acc + parseDuration(entry.duration), 0);
      setTotalMinutes(totalMinutes);
      setDisplayTime(formatTime(totalMinutes));
    }
  }, []);

  const handleAddSleep = () => {
    const start = parse(startTime, 'HH:mm', new Date());
    let end = parse(endTime, 'HH:mm', new Date());
    
    if (end < start) {
      end = addDays(end, 1);
    }

    const minutes = differenceInMinutes(end, start);
    const newTotalMinutes = totalMinutes + minutes;
    setTotalMinutes(newTotalMinutes);
    setDisplayTime(formatTime(newTotalMinutes));

    let updatedHistory;
    if (editIndex !== null) {
      updatedHistory = [...sleepHistory];
      updatedHistory[editIndex] = { start: startTime, end: endTime, duration: formatTime(minutes) };
      setEditIndex(null);
    } else {
      updatedHistory = [...sleepHistory, { start: startTime, end: endTime, duration: formatTime(minutes) }];
    }
    setSleepHistory(updatedHistory);

    setStartTime('');
    setEndTime('');

    localStorage.setItem('sleepHistory', JSON.stringify(updatedHistory));
  };

  const handleEdit = (index: number) => {
    const entry = sleepHistory[index];
    setStartTime(entry.start);
    setEndTime(entry.end);
    setEditIndex(index);
    setHistoryOpen(false);
  };

  const handleDelete = (index: number) => {
    const entry = sleepHistory[index];
    const minutes = parseDuration(entry.duration);
    const updatedTotalMinutes = totalMinutes - minutes;
    setTotalMinutes(updatedTotalMinutes);
    setDisplayTime(formatTime(updatedTotalMinutes));

    const updatedHistory = sleepHistory.filter((_, i) => i !== index);
    setSleepHistory(updatedHistory);

    localStorage.setItem('sleepHistory', JSON.stringify(updatedHistory));
  };

  const parseDuration = (duration: string) => {
    const [hours, minutes] = duration.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Convert total minutes to human-readable text
  const getHumanReadableSleepTime = () => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hours`;
    } else {
      return `${hours} hours ${minutes} minutes`;
    }
  };

  // Get sleep quality assessment
  const getSleepQuality = () => {
    if (totalMinutes < 360) {
      return { text: 'Insufficient', color: '#FF3B30' }; // less than 6 hours - poor
    } else if (totalMinutes <= 420) {
      return { text: 'Fair', color: '#FF9500' }; // 6-7 hours - fair
    } else if (totalMinutes <= 540) {
      return { text: 'Good', color: '#34C759' }; // 7-9 hours - good
    } else {
      return { text: 'Excessive', color: '#FF9500' }; // more than 9 hours - excessive
    }
  };

  const getLastSleepTime = () => {
    if (sleepHistory.length === 0) return null;
    
    const lastEntry = sleepHistory[sleepHistory.length - 1];
    return lastEntry;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Compact View - New Horizontal Design */}
      <Paper 
        elevation={0} 
        sx={{ 

          borderRadius: 2,
          background: isDark ? 'rgba(18, 18, 18, 0.4)' : 'rgba(255, 255, 255, 0.6)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {/* Header with Title and Sleep Quality */}
        <Stack 
          direction="row" 
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <BedtimeIcon 
              color="primary" 
              fontSize="small" 
              sx={{ 
                animation: totalMinutes > 0 ? 'pulse 1.5s infinite ease-in-out' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.6 }
                }
              }} 
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Sleep | {getHumanReadableSleepTime()}
        </Typography>
          </Stack>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip 
              label={getSleepQuality().text}
              size="small"
              sx={{ 
                height: 20,
                fontSize: '0.65rem',
                color: getSleepQuality().color,
                bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'white',
                fontWeight: 600
              }}
            />
            <IconButton
              size="small"
              onClick={() => setHistoryOpen(true)}
              sx={{ 
                p: 0.5,
                color: 'primary.main'
              }}
            >
              <HistoryIcon fontSize="small" />
        </IconButton>
          </Stack>
        </Stack>
        
        {/* Main Content - Time Input Controls */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1.5
          }}
        >
          {/* Time Controls */}
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                  "& .MuiInputBase-root": { height: 36 },
                  "& .MuiInputBase-input": { py: 0.75, px: 1 }
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: -8,
                  left: 8,
                  backgroundColor: isDark ? 'rgba(18, 18, 18, 0.8)' : 'white',
                  px: 0.5,
                  fontSize: '0.65rem',
                  color: 'text.secondary'
                }}
              >
                Start
              </Typography>
            </Box>
            
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
                  "& .MuiInputBase-root": { height: 36 },
                  "& .MuiInputBase-input": { py: 0.75, px: 1 }
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: -8,
                  left: 8,
                  backgroundColor: isDark ? 'rgba(18, 18, 18, 0.8)' : 'white',
                  px: 0.5,
                  fontSize: '0.65rem',
                  color: 'text.secondary'
                }}
              >
                End
        </Typography>
            </Box>
          </Box>
          
          {/* Add Button */}
          <Button 
            variant="contained" 
            onClick={handleAddSleep}
            disabled={!startTime || !endTime}
            size="small"
            sx={{ 
              minWidth: 'auto',
              height: 36,
              px: 2,
              borderRadius: 'var(--radius-md)'
            }}
          >
            {editIndex !== null ? 'Update' : 'Add'}
          </Button>
      </Box>

        {/* Quick Action Links */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mt: 1.5,
          mb: 0,
          fontSize: '0.7rem', 
          color: 'text.secondary',
          gap: 2
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
              gap: 0.5,
              '&:hover': { color: 'primary.main' },
              transition: 'color 0.2s'
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
              gap: 0.5,
              '&:hover': { color: 'primary.main' },
              transition: 'color 0.2s'
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

      {/* History Dialog */}
      <Dialog 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Sleep History
            </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setHistoryOpen(false)}
              sx={{ 
                color: 'text.secondary',
                borderRadius: 'var(--radius-md)',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: 'error.main'
                }
              }}
          >
            <CloseIcon />
          </IconButton>
          </Stack>
          
          {/* Sleep stats moved here - visual sleep analytics */}
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
              {'{'} 
              <Box component="span" sx={{ 
                mx: 0.5, 
                color: totalMinutes > 0 ? (totalMinutes < 420 ? 'error.main' : 'success.main') : 'text.disabled',
                fontWeight: 'medium' 
              }}>
                avg: {sleepHistory.length > 0 ? Math.round(totalMinutes / sleepHistory.length) : 0} min
              </Box>
              {'}'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
              {'{'} 
              <Box component="span" sx={{ 
                mx: 0.5, 
                color: sleepHistory.length > 0 ? 'info.main' : 'text.disabled',
                fontWeight: 'medium' 
              }}>
                count: {sleepHistory.length}
              </Box>
              {'}'}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {sleepHistory.length > 0 ? (
            <List sx={{ 
              width: '100%',
              p: 0,
              '& .MuiListItem-root': {
                borderBottom: '1px solid',
                borderColor: 'divider',
                py: 2
              }
            }}>
              {sleepHistory.map((entry, index) => (
                <ListItem key={index} sx={{ px: 3 }}>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {format(parse(entry.start, 'HH:mm', new Date()), 'hh:mm a')} - {format(parse(entry.end, 'HH:mm', new Date()), 'hh:mm a')}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Total: {entry.duration}
                </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEdit(index)}
                        sx={{ 
                          color: 'primary.main',
                          mr: 1
                        }}
                      >
                        <EditIcon fontSize="small" />
                  </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(index)} 
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                  </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <BedtimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No sleep records found.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Use the form above to add your sleep time.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SleepTracker;
