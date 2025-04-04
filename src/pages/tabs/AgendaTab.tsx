import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, IconButton, Grid, List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Divider, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import EventIcon from '@mui/icons-material/Event';
import { useAuth } from '../../hooks/useAuth.ts';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.ts';
import { format } from 'date-fns';

type EventCategory = 'general' | 'islamic' | 'personal' | 'work' | 'education';

interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: EventCategory;
  createdAt: Date;
}

const AgendaTab: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState<{
    title: string;
    description: string;
    date: Date | null;
    category: EventCategory;
  }>({
    title: '',
    description: '',
    date: new Date(),
    category: 'general'
  });
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Fetch events from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
      try {
        const eventsQuery = query(
          collection(db, `users/${user.uid}/events`),
          orderBy('date', 'asc')
        );
        
        const snapshot = await getDocs(eventsQuery);
        const fetchedEvents: Event[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedEvents.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            date: data.date.toDate(),
            category: data.category,
            createdAt: data.createdAt.toDate(),
          });
        });
        
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, [user]);

  const handleAddEvent = async () => {
    if (!user || !newEvent.title.trim() || !newEvent.date) return;

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        category: newEvent.category,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, `users/${user.uid}/events`), eventData);
      
      const newEventWithId: Event = {
        id: docRef.id,
        ...eventData
      };

      // Sort events by date after adding new one
      const updatedEvents = [...events, newEventWithId].sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );
      
      setEvents(updatedEvents);
      setNewEvent({
        title: '',
        description: '',
        date: new Date(),
        category: 'general'
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/events`, eventId));
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleEditStart = (event: Event) => {
    setEditEvent(event);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!user || !editEvent) return;

    try {
      await updateDoc(doc(db, `users/${user.uid}/events`, editEvent.id), {
        title: editEvent.title,
        description: editEvent.description,
        date: editEvent.date,
        category: editEvent.category
      });
      
      const updatedEvents = events.map(event => 
        event.id === editEvent.id ? editEvent : event
      ).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      setEvents(updatedEvents);
      setEditDialogOpen(false);
      setEditEvent(null);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const getCategoryColor = (category: EventCategory) => {
    switch (category) {
      case 'islamic':
        return 'success';
      case 'work':
        return 'primary';
      case 'education':
        return 'info';
      case 'personal':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Filter events for the selected date
  const filteredEvents = selectedDate 
    ? events.filter(event => 
        format(event.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
    : events;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Agenda & Calendar</Typography>
        
        <Grid container spacing={3}>
          {/* Calendar Section */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Calendar</Typography>
              
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
                sx={{ width: '100%', mb: 2 }}
              />
              
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Add New Event
              </Typography>
              
              <TextField
                fullWidth
                label="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <DatePicker
                label="Event Date"
                value={newEvent.date}
                onChange={(newDate) => setNewEvent({ ...newEvent, date: newDate })}
                sx={{ width: '100%', mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  value={newEvent.category}
                  label="Category"
                  onChange={(e) => setNewEvent({ 
                    ...newEvent, 
                    category: e.target.value as EventCategory 
                  })}
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="islamic">Islamic</MenuItem>
                  <MenuItem value="personal">Personal</MenuItem>
                  <MenuItem value="work">Work</MenuItem>
                  <MenuItem value="education">Education</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                fullWidth
                variant="contained"
                startIcon={<EventIcon />}
                onClick={handleAddEvent}
                disabled={!newEvent.title.trim() || !newEvent.date}
              >
                Add Event
              </Button>
            </Paper>
          </Grid>
          
          {/* Events List Section */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedDate 
                  ? `Events for ${format(selectedDate, 'MMMM dd, yyyy')}` 
                  : 'All Events'}
              </Typography>
              
              {filteredEvents.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No events for this date. Add your first event.
                </Typography>
              ) : (
                <List>
                  {filteredEvents.map((event) => (
                    <React.Fragment key={event.id}>
                      <ListItem sx={{ py: 2 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                {event.title}
                              </Typography>
                              <Chip 
                                label={event.category} 
                                size="small" 
                                color={getCategoryColor(event.category)} 
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.primary">
                                {format(event.date, 'MMMM dd, yyyy - hh:mm a')}
                              </Typography>
                              <Typography variant="body2">
                                {event.description}
                              </Typography>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => handleEditStart(event)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleDeleteEvent(event.id)}>
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
          </Grid>
        </Grid>
        
        {/* Edit Event Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogContent>
            {editEvent && (
              <Box sx={{ pt: 1 }}>
                <TextField
                  fullWidth
                  label="Event Title"
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={editEvent.description}
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                  sx={{ mb: 2 }}
                />
                
                <DatePicker
                  label="Event Date"
                  value={editEvent.date}
                  onChange={(newDate) => newDate && setEditEvent({ ...editEvent, date: newDate })}
                  sx={{ width: '100%', mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="edit-category-label">Category</InputLabel>
                  <Select
                    labelId="edit-category-label"
                    value={editEvent.category}
                    label="Category"
                    onChange={(e) => setEditEvent({ 
                      ...editEvent, 
                      category: e.target.value as EventCategory 
                    })}
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="islamic">Islamic</MenuItem>
                    <MenuItem value="personal">Personal</MenuItem>
                    <MenuItem value="work">Work</MenuItem>
                    <MenuItem value="education">Education</MenuItem>
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
    </LocalizationProvider>
  );
};

export default AgendaTab;
