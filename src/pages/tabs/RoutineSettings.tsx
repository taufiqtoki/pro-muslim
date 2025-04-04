import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  FormControlLabel,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { useRoutine, Routine } from '../../hooks/useRoutine';
import { usePrayerTimes } from '../../hooks/usePrayerTimes';
import { format } from 'date-fns';
import AlarmIcon from '@mui/icons-material/Alarm';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WorkIcon from '@mui/icons-material/Work';
import SportsIcon from '@mui/icons-material/Sports';

const routineTypes = [
  { value: 'prayer', label: 'Prayer', icon: <AlarmIcon /> },
  { value: 'sleep', label: 'Sleep', icon: <BedtimeIcon /> },
  { value: 'meal', label: 'Meal', icon: <RestaurantIcon /> },
  { value: 'exercise', label: 'Exercise', icon: <FitnessCenterIcon /> },
  { value: 'study', label: 'Study', icon: <MenuBookIcon /> },
  { value: 'work', label: 'Work', icon: <WorkIcon /> },
  { value: 'activity', label: 'Activity', icon: <SportsIcon /> },
];

const daysOfWeek = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const RoutineSettings: React.FC = () => {
  const { routines, loading, error, saveRoutine, deleteRoutine } = useRoutine();
  const { prayerTimes, jamaatTimes } = usePrayerTimes();
  
  const [open, setOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Partial<Routine> | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const muiTheme = useMuiTheme();
  const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setEditingRoutine(null);
      setSelectedDays([]);
    }
  }, [open]);

  const handleClickOpen = () => {
    setOpen(true);
    // Initialize with a new empty routine object
    setEditingRoutine({
      title: '',
      type: '',
      time: '',
      days: [],
      isActive: true,
      description: ''
    });
    setSelectedDays([]);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setSelectedDays(routine.days || []);
    setOpen(true);
  };

  const handleDeleteRoutine = async (id: string) => {
    const result = await deleteRoutine(id);
    if (result.success) {
      setSnackbar({
        open: true,
        message: 'Routine deleted successfully',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to delete routine',
        severity: 'error'
      });
    }
  };

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSaveRoutine = async () => {
    if (!editingRoutine || !editingRoutine.title || !editingRoutine.time || !editingRoutine.type) {
      setSnackbar({
        open: true,
        message: 'Please fill all required fields',
        severity: 'error'
      });
      return;
    }

    const routineToSave = {
      ...editingRoutine,
      days: selectedDays,
      isActive: editingRoutine.isActive ?? true,
      title: editingRoutine.title,
      type: editingRoutine.type,
      time: editingRoutine.time
    };

    const result = await saveRoutine(routineToSave);
    if (result.success) {
      setSnackbar({
        open: true,
        message: `Routine ${editingRoutine.id ? 'updated' : 'created'} successfully`,
        severity: 'success'
      });
      handleClose();
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to save routine',
        severity: 'error'
      });
    }
  };

  const handleTimeSelectFromPrayer = (prayerName: string) => {
    if (jamaatTimes && jamaatTimes[prayerName]) {
      try {
        const prayerTime = new Date(jamaatTimes[prayerName]);
        const timeString = format(prayerTime, 'HH:mm');
        setEditingRoutine(prev => ({
          ...prev,
          time: timeString
        }));
      } catch (error) {
        console.error('Error formatting prayer time:', error);
      }
    }
  };
  
  const getRoutineIcon = (type: string) => {
    const routineType = routineTypes.find(rt => rt.value === type);
    return routineType ? routineType.icon : <AlarmIcon />;
  };

  // Safely group routines by type
  const groupedRoutines = (Array.isArray(routines) ? routines : []).reduce((acc, routine) => {
    const type = routine?.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(routine);
    return acc;
  }, {} as Record<string, Routine[]>);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h1" fontWeight={600}>
          Routine Settings
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
          sx={{ borderRadius: 'var(--radius-pill)' }}
        >
          Add Routine
        </Button>
      </Stack>

      {Object.entries(groupedRoutines).length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <Typography color="text.secondary" mb={2}>
            No routines created yet
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={handleClickOpen}
            sx={{ borderRadius: 'var(--radius-pill)' }}
          >
            Create Your First Routine
          </Button>
        </Paper>
      )}

      {Object.entries(groupedRoutines).map(([type, routineList]) => (
        <Box key={type} mb={3}>
          <Typography 
            variant="h6" 
            component="h2" 
            mb={1.5}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.primary',
              fontWeight: 600
            }}
          >
            {getRoutineIcon(type)}
            {routineTypes.find(rt => rt.value === type)?.label || 'Other'}
          </Typography>
          
          <Grid container spacing={2}>
            {routineList.map((routine) => (
              <Grid item xs={12} sm={6} md={4} key={routine.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    borderRadius: 'var(--radius-lg)',
                    position: 'relative',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: 'var(--shadow-md)'
                    }
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    {getRoutineIcon(routine.type)}
                    <Typography variant="h6" component="h3" fontWeight={600}>
                      {routine.title}
                    </Typography>
                  </Stack>
                  
                  <Typography variant="body1" fontWeight={500} color="primary.main" mb={1}>
                    {routine.time}
                  </Typography>
                  
                  {routine.description && (
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {routine.description}
                    </Typography>
                  )}
                  
                  <Box mb={1.5}>
                    {routine.days && routine.days.map((day) => (
                      <Chip 
                        key={day} 
                        label={day.substring(0, 3)} 
                        size="small" 
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={routine.isActive} 
                          onChange={async () => {
                            await saveRoutine({
                              ...routine,
                              isActive: !routine.isActive
                            });
                          }}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">{routine.isActive ? 'Active' : 'Inactive'}</Typography>}
                    />
                    
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditRoutine(routine)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteRoutine(routine.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* Add/Edit Routine Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        fullScreen={isSmallScreen}
      >
        <DialogTitle>
          {editingRoutine?.id ? 'Edit Routine' : 'Add New Routine'}
        </DialogTitle>
        
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Routine Title"
              value={editingRoutine?.title || ''}
              onChange={(e) => setEditingRoutine({...editingRoutine, title: e.target.value})}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Routine Type</InputLabel>
              <Select
                value={editingRoutine?.type || ''}
                label="Routine Type"
                onChange={(e) => setEditingRoutine({...editingRoutine, type: e.target.value})}
              >
                {routineTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Time"
                type="time"
                fullWidth
                required
                value={editingRoutine?.time || ''}
                onChange={(e) => setEditingRoutine({...editingRoutine, time: e.target.value})}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              
              {jamaatTimes && Object.keys(jamaatTimes).length > 0 && (
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary" mb={1} display="block">
                    Quick select prayer times:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(jamaatTimes).map(([prayer, time]) => (
                      time && (
                        <Chip
                          key={prayer}
                          label={`${prayer} (${format(new Date(time), 'hh:mm a')})`}
                          onClick={() => handleTimeSelectFromPrayer(prayer)}
                          clickable
                          size="small"
                          sx={{ mb: 0.5 }}
                        />
                      )
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Select Days
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {daysOfWeek.map((day) => (
                  <Chip
                    key={day.value}
                    label={day.label}
                    onClick={() => handleDayToggle(day.value)}
                    color={selectedDays.includes(day.value) ? "primary" : "default"}
                    clickable
                  />
                ))}
              </Box>
            </Box>
            
            <TextField
              margin="normal"
              fullWidth
              label="Description (Optional)"
              value={editingRoutine?.description || ''}
              onChange={(e) => setEditingRoutine({...editingRoutine, description: e.target.value})}
              multiline
              rows={2}
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={editingRoutine?.isActive ?? true} 
                  onChange={(e) => setEditingRoutine({
                    ...editingRoutine, 
                    isActive: e.target.checked
                  })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSaveRoutine} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert 
          onClose={() => setSnackbar({...snackbar, open: false})} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RoutineSettings; 