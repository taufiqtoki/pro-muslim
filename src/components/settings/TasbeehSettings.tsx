import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, TextField, Typography, List, ListItem, ListItemText, IconButton, Alert, CircularProgress, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { useAuth } from '../../hooks/useAuth';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { v4 as uuidv4 } from 'uuid';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/localStorage';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDragDrop } from '../../hooks/useDragDrop';

// Define Tasbeeh type
interface Tasbeeh {
  id: string;
  name: string;
  count: number;
  order?: number;
  createdAt?: Date | string;
}

// Draggable tasbeeh item component
interface DraggableTasbeehItemProps {
  tasbeeh: Tasbeeh;
  index: number;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

const DraggableTasbeehItem: React.FC<DraggableTasbeehItemProps> = ({ 
  tasbeeh, 
  index, 
  onDelete, 
  onReorder 
}) => {
  const { isDragging, dragRef } = useDragDrop<HTMLDivElement>(
    tasbeeh.id,
    index,
    onReorder,
    'tasbeeh-item'
  );

  // Convert RefObject to Ref type that div expects
  const divRef = dragRef as unknown as React.Ref<HTMLDivElement>;

  return (
    <div 
      ref={divRef}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        marginBottom: '8px'
      }}
    >
      <Paper 
        sx={{ 
          p: 1.5, 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 'var(--shadow-sm)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        <DragHandleIcon sx={{ color: 'text.secondary', cursor: 'grab', mr: 1 }} />
        
        <ListItemText
          primary={
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {tasbeeh.name}
            </Typography>
          }
          secondary={`Count: ${tasbeeh.count}`}
          sx={{ flex: 1 }}
        />
        
        <IconButton 
          edge="end" 
          aria-label="delete"
          onClick={() => onDelete(tasbeeh.id)}
          size="small"
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Paper>
    </div>
  );
};

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
      // Sort by order if available
      const sortedTasbeehs = [...localTasbeehs].sort((a, b) => {
        return (a.order ?? 0) - (b.order ?? 0);
      });
      setTasbeehs(sortedTasbeehs);
    }

    // If online and user is logged in, set up Firestore listener
    let unsubscribe = () => { /* cleanup function */ };
    
    if (onlineStatus && user) {
      try {
      const q = query(collection(db, "tasbeehs"), where("userId", "==", user.uid));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const tasbeehList: Tasbeeh[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          tasbeehList.push({
            id: doc.id,
            name: data.name,
            count: data.count,
              order: data.order || 0,
            createdAt: data.createdAt?.toDate()
          });
        });
          
          // Sort by order
          const sortedList = [...tasbeehList].sort((a, b) => {
            return (a.order ?? 0) - (b.order ?? 0);
          });
        
        // Update state and local storage
          setTasbeehs(sortedList);
          saveToStorage(STORAGE_KEYS.TASBEEHS, sortedList);
        setLoading(false);
      }, (err) => {
        console.error("Error getting tasbeehs:", err);
        setError("Failed to load tasbeehs from server. Using local data.");
        setLoading(false);
      });
      } catch (err) {
        console.error("Error setting up listener:", err);
        setError("Failed to connect to server. Using local data.");
        setLoading(false);
      }
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
      order: tasbeehs.length,
      createdAt: new Date().toISOString()
    };
    
    try {
      // Always update local state and storage first
      const updatedTasbeehs = [...tasbeehs, newTasbeeh];
      setTasbeehs(updatedTasbeehs);
      saveToStorage(STORAGE_KEYS.TASBEEHS, updatedTasbeehs);
      
      // If online, add to Firestore
      if (onlineStatus && user) {
        try {
        await addDoc(collection(db, "tasbeehs"), {
          name: tasbeehName,
          count: count,
            order: tasbeehs.length,
          userId: user.uid,
          createdAt: new Date()
        });
        } catch (err) {
          console.warn("Firebase error (continuing with local storage):", err);
        }
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
      
      // Update order for all items
      const reorderedItems = updatedTasbeehs.map((item, idx) => ({
        ...item,
        order: idx
      }));
      
      setTasbeehs(reorderedItems);
      saveToStorage(STORAGE_KEYS.TASBEEHS, reorderedItems);
      
      // If online, delete from Firestore
      if (onlineStatus && user) {
        try {
        await deleteDoc(doc(db, "tasbeehs", id));
        } catch (err) {
          console.warn("Firebase error (continuing with local storage):", err);
        }
      }
      
      setSuccess(`Tasbeeh deleted successfully${!onlineStatus ? ' (offline mode)' : ''}`);
    } catch (error) {
      console.error("Error deleting tasbeeh:", error);
      setError('Failed to delete tasbeeh from server, but removed locally');
    } finally {
      setLoading(false);
    }
  };

  const handleReorderTasbeehs = useCallback(async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create the reordered array
      const reorderedItems = [...tasbeehs];
      const [moved] = reorderedItems.splice(fromIndex, 1);
      reorderedItems.splice(toIndex, 0, moved);
      
      // Update order property for all items
      const updatedItems = reorderedItems.map((item, idx) => ({
        ...item,
        order: idx
      }));
      
      // Update local state and storage first
      setTasbeehs(updatedItems);
      saveToStorage(STORAGE_KEYS.TASBEEHS, updatedItems);
      
      // If online and user is logged in, try to update Firestore
      if (onlineStatus && user) {
        try {
          await setDoc(doc(db, `users/${user.uid}/tasbeehs/list`), {
            items: updatedItems
          });
        } catch (err) {
          console.warn("Firebase error (continuing with local storage):", err);
        }
      }
      
      setSuccess("Tasbeeh order updated");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error reordering tasbeehs:', error);
      setError('Failed to reorder tasbeehs');
    } finally {
      setLoading(false);
    }
  }, [tasbeehs, onlineStatus, user]);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      {/* Offline indicator */}
      {!onlineStatus && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.85rem' }}>
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
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Your Tasbeehs</Typography>
        <Typography variant="body2" color="text.secondary">
          Drag to reorder
        </Typography>
      </Box>
      
      {loading && tasbeehs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <Box sx={{ mt: 1 }}>
          {tasbeehs.length === 0 ? (
              <Alert severity="info">No tasbeehs added yet. Add your first tasbeeh above.</Alert>
          ) : (
              tasbeehs.map((tasbeeh, index) => (
                <DraggableTasbeehItem
                key={tasbeeh.id}
                  tasbeeh={tasbeeh}
                  index={index}
                  onDelete={handleDelete}
                  onReorder={handleReorderTasbeehs}
                />
              ))
            )}
          </Box>
        </DndProvider>
      )}
    </Box>
  );
};

export default TasbeehSettings;
