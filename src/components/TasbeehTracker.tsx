import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ListItemText, 
  Box, 
  Typography, 
  Stack, 
  IconButton, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  Paper
} from '@mui/material';
import { useTasbeehs, Tasbeeh } from '../hooks/useTasbeehs';
import { useAuth } from '../hooks/useAuth';
import TasbeehCounter from './TasbeehCounter';
import TimelineIcon from '@mui/icons-material/Timeline';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CountertopsIcon from '@mui/icons-material/Countertops';
import CounterIcon from '@mui/icons-material/TouchApp';
import SettingsIcon from '@mui/icons-material/Settings';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { doc, setDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/localStorage';
import { useNavigate } from 'react-router-dom';

interface TasbeehWithGoal extends Tasbeeh {
  goal?: number;
}

interface TasbeehTrackerProps {
  initialTasbeehs?: TasbeehWithGoal[];
}

const EmptyTasbeehList = ({ onAddClick }: { onAddClick: () => void }) => (
  <Box 
    sx={{ 
      textAlign: 'center', 
      p: 1.5, 
      borderRadius: 'var(--radius-md)',
      bgcolor: 'background.paper',
      border: '1px dashed',
      borderColor: 'divider',
      height: '90px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <TimelineIcon sx={{ fontSize: 24, color: 'text.secondary', mb: 0.5 }} />
    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
      Your tasbeeh list is empty
    </Typography>
    <Button 
      variant="contained" 
      startIcon={<AddCircleIcon />}
      onClick={onAddClick}
      size="small"
      sx={{ 
        borderRadius: 'var(--radius-pill)',
        textTransform: 'none',
        py: 0.25
      }}
    >
      Add First Tasbeeh
    </Button>
  </Box>
);

// Updated TasbeehItem component to be more compact without drag functionality
const TasbeehItem: React.FC<{ tasbeeh: TasbeehWithGoal; onOpenCounter: (tasbeeh: TasbeehWithGoal) => void }> = ({ 
  tasbeeh, 
  onOpenCounter 
}) => {
  // Define goal (hardcoded to 33 for now or use tasbeeh.goal if available)
  const goal = tasbeeh.goal || 33;
  const progress = Math.min(100, (tasbeeh.count / goal) * 100);
  
  // Updated progress color logic to match TasbeehCounter
  const getProgressColor = () => {
    if (progress >= 100) return 'info.main'; // Blue at 100%
    if (progress >= 30) return 'success.main'; // Green from 30% to 99%
    return 'text.secondary'; // Black/dark until 30%
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        p: 0.75,
        mb: 0.75,
        borderRadius: 'var(--radius-md)',
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          boxShadow: 'var(--shadow-sm)',
          transform: 'translateY(-1px)'
        }
      }}
    >
      {/* Progress bar background */}
      <Box 
        sx={{ 
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${progress}%`,
          bgcolor: getProgressColor(),
          opacity: 0.1,
          transition: 'width 0.3s ease, background-color 0.3s ease'
        }}
      />
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '70%'
          }}
        >
          {tasbeeh.name}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {tasbeeh.count}/{goal}
          </Typography>
          
          <IconButton
            size="small"
            onClick={() => onOpenCounter(tasbeeh)}
            sx={{
              color: 'primary.main',
              bgcolor: 'rgba(var(--primary-rgb), 0.1)',
              '&:hover': {
                bgcolor: 'rgba(var(--primary-rgb), 0.2)'
              },
              width: 22,
              height: 22,
              p: 0.5
            }}
          >
            <CounterIcon sx={{ fontSize: '0.85rem' }} />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

const TasbeehTracker: React.FC<TasbeehTrackerProps> = ({ initialTasbeehs = [] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasbeehs, loading: tasbeehsLoading, error: tasbeehsError } = useTasbeehs();
  const [openDialog, setOpenDialog] = useState(false);
  const [newTasbeehName, setNewTasbeehName] = useState('');
  const [newTasbeehGoal, setNewTasbeehGoal] = useState(33);
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [selectedTasbeeh, setSelectedTasbeeh] = useState<TasbeehWithGoal | null>(null);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [tasbeehItems, setTasbeehItems] = useState<TasbeehWithGoal[]>(initialTasbeehs || []);
  const [isSaving, setIsSaving] = useState(false);

  // Define loading and error components first to avoid linter errors
  const loadingComponent = (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
      <CircularProgress size={30} thickness={4} />
    </Box>
  );

  const errorComponent = (
    <Box p={1.5}>
      <Alert severity="error" sx={{ fontSize: '0.85rem' }}>{tasbeehsError}</Alert>
    </Box>
  );

  // Track online status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set items based on tasbeehs from hook
  useEffect(() => {
    if (tasbeehsLoading) return;
    
    if (tasbeehs && tasbeehs.length > 0) {
      setTasbeehItems(tasbeehs);
    } else if (initialTasbeehs && initialTasbeehs.length > 0) {
      setTasbeehItems(initialTasbeehs);
    } else {
      // Try to get from local storage
      const storedTasbeehs = getFromStorage<Tasbeeh[]>(STORAGE_KEYS.TASBEEHS, []);
      if (storedTasbeehs.length > 0) {
        setTasbeehItems(storedTasbeehs);
      }
    }
  }, [tasbeehsLoading, tasbeehs, initialTasbeehs]);

  const handleOpenDialog = useCallback(() => {
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setNewTasbeehName('');
  }, []);

  const handleAddTasbeeh = useCallback(async () => {
    if (!newTasbeehName.trim()) return;
    
    setIsAdding(true);
    setError(null);
    
    try {
      const newTasbeeh: TasbeehWithGoal = {
        id: uuidv4(),
        name: newTasbeehName.trim(),
        count: 0,
        goal: newTasbeehGoal,
        order: tasbeehItems.length,
        createdAt: new Date().toISOString()
      };
      
      // Update local state and storage first
      const updatedItems = [...tasbeehItems, newTasbeeh];
      setTasbeehItems(updatedItems);
      saveToStorage(STORAGE_KEYS.TASBEEHS, updatedItems);
      
      // If online and user is logged in, try to add to Firestore but don't block on errors
      if (onlineStatus && user) {
        try {
      // Add to Firestore
          if (tasbeehItems.length === 0) {
        // Create new document if this is the first tasbeeh
        await setDoc(doc(db, `users/${user.uid}/tasbeehs/list`), {
          items: [newTasbeeh]
        });
      } else {
        // Update existing document
        await updateDoc(doc(db, `users/${user.uid}/tasbeehs/list`), {
          items: arrayUnion(newTasbeeh)
        });
          }
        } catch (firebaseError) {
          console.warn('Firebase error (continuing with local storage):', firebaseError);
          // Silently continue with local storage only
        }
      }
      
      setSuccess('New tasbeeh added successfully' + (!onlineStatus ? ' (offline mode)' : ''));
      handleCloseDialog();
    } catch (error) {
      console.error('Error adding tasbeeh:', error);
      setError('Problem adding new tasbeeh');
    } finally {
      setIsAdding(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [newTasbeehName, tasbeehItems, onlineStatus, user, handleCloseDialog, newTasbeehGoal]);

  const handleOpenCounter = useCallback((tasbeeh: TasbeehWithGoal) => {
    // Save the current state to local storage before navigating
    saveToStorage(STORAGE_KEYS.TASBEEHS, tasbeehItems);
    
    // Navigate to the counter route with tasbeeh data
    navigate(`/tasbeeh-counter/${tasbeeh.id}`, { 
      state: { 
        tasbeeh: tasbeeh.name, 
        goal: tasbeeh.goal || 33,
        id: tasbeeh.id,
        currentCount: tasbeeh.count
      } 
    });
  }, [navigate, tasbeehItems]);

  const handleCloseCounter = useCallback(async (count: number) => {
    if (!selectedTasbeeh) {
      setCounterOpen(false);
      return;
    }
    
    setIsSaving(true);
    
    try {
      const updatedCount = selectedTasbeeh.count + count;
      const updatedTasbeeh = { ...selectedTasbeeh, count: updatedCount };
      
      // Update local state and storage first
      const updatedItems = tasbeehItems.map(t => 
        t.id === selectedTasbeeh.id ? updatedTasbeeh : t
      );
      setTasbeehItems(updatedItems);
      saveToStorage(STORAGE_KEYS.TASBEEHS, updatedItems);
      
      // If online and user is logged in, try to update Firestore but don't block on errors
      if (onlineStatus && user) {
        try {
          await updateDoc(doc(db, `users/${user.uid}/tasbeehs`, selectedTasbeeh.id), {
            count: increment(count)
          });
        } catch (firebaseError) {
          console.warn('Firebase error (continuing with local storage):', firebaseError);
          // Silently continue with local storage only
        }
      }
      
      if (count > 0) {
        setSuccess(`${count} tasbeeh count updated`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Error updating tasbeeh count:', error);
      setError('Error updating tasbeeh count');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSaving(false);
      setCounterOpen(false);
      setSelectedTasbeeh(null);
    }
  }, [selectedTasbeeh, tasbeehItems, onlineStatus, user]);

  // Navigate to settings
  const goToSettings = useCallback(() => {
    navigate('/settings', { state: { defaultTab: 0 } });
  }, [navigate]);

  // Generate content based on tasbeeh items
  const TasbeehTrackerContent = useMemo(() => {
    if (tasbeehItems.length === 0) {
      return <EmptyTasbeehList onAddClick={handleOpenDialog} />;
    }

    // Only show the first 3 tasbeehs
    const displayedTasbeehs = tasbeehItems.slice(0, 3);
    const remainingCount = tasbeehItems.length - 3;

    return (
      <Box sx={{ 
        width: '100%', 
        height: '90px',
        overflow: 'hidden',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        }
      }}>
        <Box>
          {displayedTasbeehs.map((tasbeeh) => (
            <TasbeehItem
              key={tasbeeh.id}
              tasbeeh={tasbeeh}
              onOpenCounter={handleOpenCounter}
            />
          ))}
          
          {remainingCount > 0 && (
            <Box 
        sx={{ 
                width: '100%', 
                p: 0.5, 
                textAlign: 'center',
                color: 'primary.main',
                fontSize: '0.75rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'rgba(var(--primary-rgb), 0.05)'
                }
              }}
              onClick={goToSettings}
            >
              +{remainingCount} more
            </Box>
          )}
        </Box>
    </Box>
  );
  }, [tasbeehItems, handleOpenDialog, handleOpenCounter, goToSettings]);

  // Main render
  return (
    <Box sx={{ px: 0.5, height: '100%' }}>
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ mb: 0.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography 
            variant="subtitle2" 
            component="h2"
            sx={{ 
              fontWeight: 600
            }}
          >
            Tasbeeh
          </Typography>
        </Stack>
        
        <IconButton
          color="primary"
          onClick={goToSettings}
          size="small"
          sx={{ 
            color: 'primary.main',
            bgcolor: 'rgba(var(--primary-rgb), 0.05)',
            '&:hover': {
              bgcolor: 'rgba(var(--primary-rgb), 0.1)'
            },
            width: 24,
            height: 24
          }}
        >
          <SettingsIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Stack>

      {/* Success and Error messages */}
      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 0.5, 
            py: 0, 
            px: 1,
            fontSize: '0.7rem', 
            '& .MuiAlert-icon': {
              fontSize: '1rem',
              py: 0.5
            }
          }}
        >
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 0.5, 
            py: 0, 
            px: 1,
            fontSize: '0.7rem',
            '& .MuiAlert-icon': {
              fontSize: '1rem',
              py: 0.5
            }
          }}
        >
          {error}
        </Alert>
      )}

      {/* Offline indicator - compact version */}
      {!onlineStatus && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 0.5, 
            py: 0, 
            px: 1,
            fontSize: '0.7rem', 
            borderRadius: 'var(--radius-md)',
            '& .MuiAlert-icon': {
              fontSize: '1rem',
              py: 0.5
            }
          }}
        >
          Offline mode. Changes saved locally.
        </Alert>
      )}

      {/* Conditional content rendering */}
      {tasbeehsLoading && !tasbeehItems.length ? loadingComponent :
       tasbeehsError && !tasbeehItems.length ? errorComponent :
       TasbeehTrackerContent}

      {/* Add Tasbeeh Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            borderRadius: 'var(--radius-md)',
            width: '100%',
            maxWidth: 400
          }
        }}
      >
        <DialogTitle>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Add New Tasbeeh
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tasbeeh Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTasbeehName}
            onChange={(e) => setNewTasbeehName(e.target.value)}
            sx={{ 
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 'var(--radius-md)'
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddTasbeeh} 
            variant="contained"
            disabled={!newTasbeehName.trim() || isAdding}
            startIcon={isAdding ? <CircularProgress size={16} /> : null}
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              textTransform: 'none'
            }}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tasbeeh Counter Modal */}
      {selectedTasbeeh && counterOpen && (
        <TasbeehCounter
          tasbeeh={selectedTasbeeh.name}
          goal={selectedTasbeeh.goal || 33}
          onClose={handleCloseCounter}
        />
      )}
    </Box>
  );
};

export default TasbeehTracker;
