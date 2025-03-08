import React, { useState, useEffect } from 'react';
import { Paper, Typography, TextField, Box, Button, Grid, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { differenceInMinutes, addDays, parse, format } from 'date-fns';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const SleepTracker: React.FC = () => {
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

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" gutterBottom>
          Sleep Tracking
        </Typography>
        <IconButton onClick={() => setHistoryOpen(true)}>
          <HistoryIcon />
        </IconButton>
      </Box>
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <TextField
            label="Start Time"
            type="time"
            fullWidth
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="End Time"
            type="time"
            fullWidth
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleAddSleep}>
          {editIndex !== null ? 'Update Sleep' : 'Add Sleep'}
        </Button>
        <Typography variant="body1">
          Total Time Slept: {displayTime}
        </Typography>
      </Box>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)}>
        <DialogTitle>
          Sleep History
          <IconButton
            aria-label="close"
            onClick={() => setHistoryOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {sleepHistory.length > 0 ? (
            sleepHistory.map((entry, index) => (
              <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  {format(parse(entry.start, 'HH:mm', new Date()), 'hh:mm a')} - {format(parse(entry.end, 'HH:mm', new Date()), 'hh:mm a')}: {entry.duration}
                </Typography>
                <Box>
                  <IconButton size="small" onClick={() => handleEdit(index)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            ))
          ) : (
            <Typography variant="body2">No sleep records found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SleepTracker;
