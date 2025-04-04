import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, IconButton, Grid, List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Divider, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../../hooks/useAuth.ts';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.ts';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext.tsx';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`routine-tabpanel-${index}`}
      aria-labelledby={`routine-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `routine-tab-${index}`,
    'aria-controls': `routine-tabpanel-${index}`,
  };
}

// Days of the week
const weekDays = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Time slots for the day
const timeSlots = [
  '5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM',
  '9:00 PM', '10:00 PM', '11:00 PM'
];

interface RoutineItem {
  id: string;
  title: string;
  description: string;
  day: string;  // For weekly
  time: string;
  category: 'prayer' | 'work' | 'study' | 'self-care' | 'family' | 'other';
  createdAt: Date;
}

const RoutineTab: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [newItem, setNewItem] = useState<{
    title: string;
    description: string;
    day: string;
    time: string;
    category: 'prayer' | 'work' | 'study' | 'self-care' | 'family' | 'other';
  }>({
    title: '',
    description: '',
    day: 'Monday',
    time: '7:00 AM',
    category: 'other'
  });
  
  const [editItem, setEditItem] = useState<RoutineItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Fetch routine items from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchRoutineItems = async () => {
      try {
        const routineQuery = query(
          collection(db, `users/${user.uid}/routineItems`),
          orderBy('time')
        );
        
        const snapshot = await getDocs(routineQuery);
        const fetchedItems: RoutineItem[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedItems.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            day: data.day,
            time: data.time,
            category: data.category,
            createdAt: data.createdAt.toDate(),
          });
        });
        
        setRoutineItems(fetchedItems);
      } catch (error) {
        console.error("Error fetching routine items:", error);
      }
    };

    fetchRoutineItems();
  }, [user]);

  const handleAddItem = async () => {
    if (!user || !newItem.title.trim()) return;

    try {
      const itemData = {
        title: newItem.title,
        description: newItem.description,
        day: newItem.day,
        time: newItem.time,
        category: newItem.category,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, `users/${user.uid}/routineItems`), itemData);
      
      const newRoutineItem: RoutineItem = {
        id: docRef.id,
        ...itemData
      };

      // Add new item and sort by time
      const sortedItems = [...routineItems, newRoutineItem].sort((a, b) => {
        // Convert time string to comparable value (e.g., minutes since midnight)
        const getMinutes = (timeStr: string) => {
          const [hourStr, minuteStr] = timeStr.split(':');
          const [hourVal, period] = hourStr.split(' ');
          let hour = parseInt(hourVal);
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          return hour * 60 + parseInt(minuteStr || '0');
        };
        
        return getMinutes(a.time) - getMinutes(b.time);
      });
      
      setRoutineItems(sortedItems);
      setNewItem({
        title: '',
        description: '',
        day: newItem.day,
        time: newItem.time,
        category: 'other'
      });
    } catch (error) {
      console.error("Error adding routine item:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/routineItems`, itemId));
      setRoutineItems(routineItems.filter(item => item.id !== itemId));
    } catch (error) {
      console.error("Error deleting routine item:", error);
    }
  };

  const handleEditStart = (item: RoutineItem) => {
    setEditItem(item);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!user || !editItem) return;

    try {
      await updateDoc(doc(db, `users/${user.uid}/routineItems`, editItem.id), {
        title: editItem.title,
        description: editItem.description,
        day: editItem.day,
        time: editItem.time,
        category: editItem.category
      });
      
      const updatedItems = routineItems.map(item => 
        item.id === editItem.id ? editItem : item
      ).sort((a, b) => {
        // Convert time string to comparable value for sorting
        const timeA = a.time.replace('AM', '0').replace('PM', '1');
        const timeB = b.time.replace('AM', '0').replace('PM', '1');
        return timeA.localeCompare(timeB);
      });
      
      setRoutineItems(updatedItems);
      setEditDialogOpen(false);
      setEditItem(null);
    } catch (error) {
      console.error("Error updating routine item:", error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'prayer':
        return 'success';
      case 'work':
        return 'primary';
      case 'study':
        return 'info';
      case 'self-care':
        return 'secondary';
      case 'family':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'prayer':
        return 'Prayer';
      case 'work':
        return 'Work';
      case 'study':
        return 'Study';
      case 'self-care':
        return 'Self-care';
      case 'family':
        return 'Family';
      default:
        return 'Other';
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDay(event.target.value);
  };

  // Filter items based on current view (daily or weekly) and selected day
  const filteredItems = routineItems.filter(item => {
    if (tabValue === 0) { // Daily view
      return item.day === selectedDay;
    }
    return true; // Weekly view shows all
  });

  // Group items by day for weekly view
  const itemsByDay = weekDays.reduce((acc, day) => {
    acc[day] = routineItems.filter(item => item.day === day);
    return acc;
  }, {} as Record<string, RoutineItem[]>);

  return (
    <Box sx={{ py: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Routine
        </Typography>
        
        <IconButton
          onClick={() => navigate('/routine/settings')}
          size="medium"
          sx={{ 
            color: 'primary.main',
            bgcolor: isDark ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(var(--primary-rgb), 0.05)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(var(--primary-rgb), 0.1)'
            }
          }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Routine Planner</Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="routine tabs">
            <Tab label="Daily View" {...a11yProps(0)} />
            <Tab label="Weekly View" {...a11yProps(1)} />
          </Tabs>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Add New Routine Item</Typography>
              
              <TextField
                fullWidth
                label="Title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="day-label">Day</InputLabel>
                <Select
                  labelId="day-label"
                  value={newItem.day}
                  label="Day"
                  onChange={(e) => setNewItem({ ...newItem, day: e.target.value as string })}
                >
                  {weekDays.map((day) => (
                    <MenuItem key={day} value={day}>{day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="time-label">Time</InputLabel>
                <Select
                  labelId="time-label"
                  value={newItem.time}
                  label="Time"
                  onChange={(e) => setNewItem({ ...newItem, time: e.target.value as string })}
                >
                  {timeSlots.map((time) => (
                    <MenuItem key={time} value={time}>{time}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  value={newItem.category}
                  label="Category"
                  onChange={(e) => setNewItem({ 
                    ...newItem, 
                    category: e.target.value as 'prayer' | 'work' | 'study' | 'self-care' | 'family' | 'other'
                  })}
                >
                  <MenuItem value="prayer">Prayer</MenuItem>
                  <MenuItem value="work">Work</MenuItem>
                  <MenuItem value="study">Study</MenuItem>
                  <MenuItem value="self-care">Self-care</MenuItem>
                  <MenuItem value="family">Family</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                disabled={!newItem.title.trim()}
              >
                Add to Routine
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            {/* Daily View */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="view-day-label">Select Day</InputLabel>
                  <Select
                    labelId="view-day-label"
                    value={selectedDay}
                    label="Select Day"
                    onChange={(e) => setSelectedDay(e.target.value as string)}
                  >
                    {weekDays.map((day) => (
                      <MenuItem key={day} value={day}>{day}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>{selectedDay}&apos;s Routine</Typography>
                
                {filteredItems.length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No routine items for {selectedDay}. Add your first routine item.
                  </Typography>
                ) : (
                  <List>
                    {filteredItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <ListItem sx={{ py: 2 }}>
                          <Box sx={{ mr: 2, minWidth: '80px', textAlign: 'center' }}>
                            <Typography variant="h6">{item.time}</Typography>
                          </Box>
                          
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1">
                                  {item.title}
                                </Typography>
                                <Chip 
                                  label={getCategoryLabel(item.category)} 
                                  size="small" 
                                  color={getCategoryColor(item.category)} 
                                />
                              </Box>
                            }
                            secondary={item.description}
                          />
                          
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleEditStart(item)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" onClick={() => handleDeleteItem(item.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </TabPanel>
            
            {/* Weekly View */}
            <TabPanel value={tabValue} index={1}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Weekly Routine</Typography>
                
                {routineItems.length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Your weekly routine is empty. Add items to see them here.
                  </Typography>
                ) : (
                  <Box>
                    {weekDays.map((day) => (
                      <Box key={day} sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1, bgcolor: 'action.selected', p: 1, borderRadius: 1 }}>
                          {day}
                        </Typography>
                        
                        {itemsByDay[day]?.length > 0 ? (
                          <List>
                            {itemsByDay[day].map((item) => (
                              <ListItem key={item.id} sx={{ py: 1 }}>
                                <Box sx={{ mr: 2, minWidth: '80px', textAlign: 'center' }}>
                                  <Typography variant="body1">{item.time}</Typography>
                                </Box>
                                
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body1">
                                        {item.title}
                                      </Typography>
                                      <Chip 
                                        label={getCategoryLabel(item.category)} 
                                        size="small" 
                                        color={getCategoryColor(item.category)} 
                                      />
                                    </Box>
                                  }
                                  secondary={item.description}
                                />
                                
                                <ListItemSecondaryAction>
                                  <IconButton edge="end" size="small" onClick={() => handleEditStart(item)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton edge="end" size="small" onClick={() => handleDeleteItem(item.id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 1, pl: 2 }}>
                            No items scheduled for {day}
                          </Typography>
                        )}
                        
                        <Divider sx={{ mt: 1 }} />
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </TabPanel>
          </Grid>
        </Grid>
        
        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit Routine Item</DialogTitle>
          <DialogContent>
            {editItem && (
              <Box sx={{ pt: 1 }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={editItem.title}
                  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={editItem.description}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="edit-day-label">Day</InputLabel>
                  <Select
                    labelId="edit-day-label"
                    value={editItem.day}
                    label="Day"
                    onChange={(e) => setEditItem({ ...editItem, day: e.target.value as string })}
                  >
                    {weekDays.map((day) => (
                      <MenuItem key={day} value={day}>{day}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="edit-time-label">Time</InputLabel>
                  <Select
                    labelId="edit-time-label"
                    value={editItem.time}
                    label="Time"
                    onChange={(e) => setEditItem({ ...editItem, time: e.target.value as string })}
                  >
                    {timeSlots.map((time) => (
                      <MenuItem key={time} value={time}>{time}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="edit-category-label">Category</InputLabel>
                  <Select
                    labelId="edit-category-label"
                    value={editItem.category}
                    label="Category"
                    onChange={(e) => setEditItem({ 
                      ...editItem, 
                      category: e.target.value as 'prayer' | 'work' | 'study' | 'self-care' | 'family' | 'other'
                    })}
                  >
                    <MenuItem value="prayer">Prayer</MenuItem>
                    <MenuItem value="work">Work</MenuItem>
                    <MenuItem value="study">Study</MenuItem>
                    <MenuItem value="self-care">Self-care</MenuItem>
                    <MenuItem value="family">Family</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              startIcon={<SaveIcon />}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default RoutineTab;
