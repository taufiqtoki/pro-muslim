import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, List, ListItem, ListItemText, IconButton, Alert, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useAuth } from '../../hooks/useAuth';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { v4 as uuidv4 } from 'uuid';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/localStorage';

// Define Tasbeeh type
interface Tasbeeh {
  id: string;
  name: string;
  count: number;
  createdAt?: Date;
}

const TasbeehSettings = () => {
  const [tasbeehName, setTasbeehName] = useState('');
  const [tasbeehCount, setTasbeehCount] = useState('33');
  const [tasbeehs, setTasbeehs] = useState<Tasbeeh[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);
  const { user } = useAuth();

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load tasbeehs from Firestore and local storage
  useEffect(() => {
    setLoading(true);
    setError(null);

    // First load from local storage
    const localTasbeehs = getFromStorage<Tasbeeh[]>(STORAGE_KEYS.TASBEEHS, []);
    if (localTasbeehs.length > 0) {
      setTasbeehs(localTasbeehs);
    }

    // If online and user is logged in, set up Firestore listener
    let unsubscribe = () => { /* cleanup function */ };
    
    if (onlineStatus && user) {
      const q = query(collection(db, "tasbeehs"), where("userId", "==", user.uid));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const tasbeehList: Tasbeeh[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          tasbeehList.push({
            id: doc.id,
            name: data.name,
            count: data.count,
            createdAt: data.createdAt?.toDate()
          });
        });
        
        // Update state and local storage
        setTasbeehs(tasbeehList);
        saveToStorage(STORAGE_KEYS.TASBEEHS, tasbeehList);
        setLoading(false);
      }, (err) => {
        console.error("Error getting tasbeehs:", err);
        setError("Failed to load tasbeehs from server. Using local data.");
        setLoading(false);
      });
    } else {
      setLoading(false);
      if (!onlineStatus) {
        setError("You are offline. Using locally stored tasbeehs.");
      }
    }

    return () => unsubscribe();
  }, [user, onlineStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tasbeehName.trim()) {
      setError('Tasbeeh name is required');
      return;
    }
    
    const count = parseInt(tasbeehCount);
    if (isNaN(count) || count <= 0) {
      setError('Count must be a positive number');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const newTasbeeh: Tasbeeh = {
      id: uuidv4(), // Generate temporary ID for local storage
      name: tasbeehName,
      count: count,
      createdAt: new Date()
    };
    
    try {
      // Always update local state and storage first
      const updatedTasbeehs = [...tasbeehs, newTasbeeh];
      setTasbeehs(updatedTasbeehs);
      saveToStorage(STORAGE_KEYS.TASBEEHS, updatedTasbeehs);
      
      // If online, add to Firestore
      if (onlineStatus && user) {
        await addDoc(collection(db, "tasbeehs"), {
          name: tasbeehName,
          count: count,
          userId: user.uid,
          createdAt: new Date()
        });
      }
      
      setTasbeehName('');
      setTasbeehCount('33');
      setSuccess(`Tasbeeh added successfully${!onlineStatus ? ' (offline mode)' : ''}`);
    } catch (error) {
      console.error("Error adding tasbeeh:", error);
      setError('Failed to add tasbeeh to server, but saved locally');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update local state and storage first
      const updatedTasbeehs = tasbeehs.filter(t => t.id !== id);
      setTasbeehs(updatedTasbeehs);
      saveToStorage(STORAGE_KEYS.TASBEEHS, updatedTasbeehs);
      
      // If online, delete from Firestore
      if (onlineStatus && user) {
        await deleteDoc(doc(db, "tasbeehs", id));
      }
      
      setSuccess(`Tasbeeh deleted successfully${!onlineStatus ? ' (offline mode)' : ''}`);
    } catch (error) {
      console.error("Error deleting tasbeeh:", error);
      setError('Failed to delete tasbeeh from server, but removed locally');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      {/* Offline indicator */}
      {!onlineStatus && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are currently offline. Changes will be saved locally and synced when you&apos;re back online.
        </Alert>
      )}
      
      <Typography variant="h6" gutterBottom>Tasbeeh Settings</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            label="Tasbeeh Name"
            value={tasbeehName}
            onChange={(e) => setTasbeehName(e.target.value)}
            fullWidth
            required
            sx={{ flexGrow: 1 }}
          />
          <TextField
            label="Count"
            value={tasbeehCount}
            onChange={(e) => setTasbeehCount(e.target.value)}
            type="number"
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ width: { xs: '100%', sm: '100px' } }}
          />
        </Box>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <AddCircleIcon />}
          disabled={loading}
        >
          Add Tasbeeh
        </Button>
      </Box>
      
      <Typography variant="h6" gutterBottom>Your Tasbeehs</Typography>
      
      {loading && tasbeehs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {tasbeehs.length === 0 ? (
            <ListItem>
              <ListItemText primary="No tasbeehs added yet" />
            </ListItem>
          ) : (
            tasbeehs.map((tasbeeh) => (
              <ListItem
                key={tasbeeh.id}
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => handleDelete(tasbeeh.id)}
                    disabled={loading}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ 
                  mb: 1, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 1 
                }}
              >
                <ListItemText
                  primary={tasbeeh.name}
                  secondary={`Count: ${tasbeeh.count}`}
                />
              </ListItem>
            ))
          )}
        </List>
      )}
    </Box>
  );
};

export default TasbeehSettings;
