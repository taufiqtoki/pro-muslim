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
import { doc, setDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/localStorage';

interface TasbeehTrackerProps {
  initialTasbeehs?: Tasbeeh[];
}

const EmptyTasbeehList = ({ onAddClick }: { onAddClick: () => void }) => (
  <Box 
    sx={{ 
      textAlign: 'center', 
      p: 3, 
      borderRadius: 'var(--radius-md)',
      bgcolor: 'background.paper',
      border: '1px dashed',
      borderColor: 'divider'
    }}
  >
    <TimelineIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
      আপনার তাসবিহ তালিকা খালি
    </Typography>
    <Button 
      variant="contained" 
      startIcon={<AddCircleIcon />}
      onClick={onAddClick}
      sx={{ 
        borderRadius: 'var(--radius-pill)',
        textTransform: 'none'
      }}
    >
      প্রথম তাসবিহ যোগ করুন
    </Button>
  </Box>
);

const TasbeehTracker: React.FC<TasbeehTrackerProps> = ({ initialTasbeehs = [] }) => {
  const { user } = useAuth();
  const { tasbeehs, loading: tasbeehsLoading, error: tasbeehsError } = useTasbeehs();
  const [openDialog, setOpenDialog] = useState(false);
  const [newTasbeehName, setNewTasbeehName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [selectedTasbeeh, setSelectedTasbeeh] = useState<Tasbeeh | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);
  const [tasbeehItems, setTasbeehItems] = useState<Tasbeeh[]>(initialTasbeehs || []);
  const [isSaving, setIsSaving] = useState(false);

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
      const newTasbeeh: Tasbeeh = {
        id: uuidv4(),
        name: newTasbeehName.trim(),
        count: 0,
        order: tasbeehItems.length,
        createdAt: new Date().toISOString()
      };
      
      // Update local state and storage first
      const updatedItems = [...tasbeehItems, newTasbeeh];
      setTasbeehItems(updatedItems);
      saveToStorage(STORAGE_KEYS.TASBEEHS, updatedItems);
      
      // If online and user is logged in, add to Firestore
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
          console.error('Error adding tasbeeh to Firestore:', firebaseError);
          setError('ফায়ারবেস ডাটাবেসে সংরক্ষণ করা যায়নি। তবে স্থানীয়ভাবে সংরক্ষিত হয়েছে।');
        }
      }
      
      setSuccess('নতুন তাসবিহ সফলভাবে যোগ করা হয়েছে' + (!onlineStatus ? ' (অফলাইন মোডে)' : ''));
      handleCloseDialog();
    } catch (error) {
      console.error('Error adding tasbeeh:', error);
      setError('তাসবিহ যোগ করতে সমস্যা হয়েছে');
    } finally {
      setIsAdding(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [newTasbeehName, tasbeehItems, onlineStatus, user, handleCloseDialog]);

  const handleOpenCounter = useCallback((tasbeeh: Tasbeeh) => {
    setSelectedTasbeeh(tasbeeh);
    setCounterOpen(true);
  }, []);

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
      
      // If online and user is logged in, update Firestore
      if (onlineStatus && user) {
        try {
          await updateDoc(doc(db, `users/${user.uid}/tasbeehs`, selectedTasbeeh.id), {
            count: increment(count)
          });
        } catch (firebaseError) {
          console.error('Error updating tasbeeh count in Firestore:', firebaseError);
          // No need to show error to user if local update worked
        }
      }
      
      if (count > 0) {
        setSuccess(`${count} তাসবিহ গণনা করা হয়েছে`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Error updating tasbeeh count:', error);
      setError('তাসবিহ গণনা আপডেট করতে সমস্যা হয়েছে');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSaving(false);
      setCounterOpen(false);
      setSelectedTasbeeh(null);
    }
  }, [selectedTasbeeh, tasbeehItems, onlineStatus, user]);

  // Render a single tasbeeh item
  const renderTasbeehItem = useCallback((tasbeeh: Tasbeeh, index: number) => (
    <ListItem 
      key={tasbeeh.id}
      sx={{ 
        p: 0.75,
        mb: 1,
        '&:last-child': { mb: 0 }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          p: 2,
          borderRadius: 'var(--radius-md)',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: 'var(--shadow-sm)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        <ListItemText 
          primary={
            <Typography 
              variant="subtitle1" 
              sx={{ fontWeight: 600 }}
            >
              {tasbeeh.name}
            </Typography>
          }
          secondary={
            <Typography variant="body2" color="text.secondary">
              বর্তমান গণনা: {tasbeeh.count}
            </Typography>
          }
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={`${tasbeeh.count}`} 
            color="primary" 
            size="small"
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              minWidth: 40,
              fontWeight: 600,
              px: 1,
              color: 'white',
              background: 'linear-gradient(45deg, var(--primary-color) 30%, var(--primary-light) 90%)'
            }}
          />
          
          <IconButton
            size="small"
            onClick={() => handleOpenCounter(tasbeeh)}
            sx={{
              color: 'primary.main',
              bgcolor: 'rgba(var(--primary-rgb), 0.1)',
              '&:hover': {
                bgcolor: 'rgba(var(--primary-rgb), 0.2)'
              },
              width: 30,
              height: 30
            }}
          >
            <CounterIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    </ListItem>
  ), [handleOpenCounter]);

  // Simple tasbeeh list
  const renderTasbeehList = useCallback(() => (
    <List sx={{ p: 0 }}>
      {tasbeehItems.map((tasbeeh, index) => renderTasbeehItem(tasbeeh, index))}
    </List>
  ), [tasbeehItems, renderTasbeehItem]);

  // Generate content based on tasbeeh items
  const tasbeehContent = useMemo(() => {
    if (tasbeehItems.length === 0) {
      return <EmptyTasbeehList onAddClick={handleOpenDialog} />;
    }
    
    return renderTasbeehList();
  }, [tasbeehItems, handleOpenDialog, renderTasbeehList]);

  // Loading and error handling components
  const loadingComponent = (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );

  const errorComponent = (
    <Box p={3}>
      <Alert severity="error">{tasbeehsError}</Alert>
    </Box>
  );

  // Main render
  return (
    <Box>
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CountertopsIcon color="primary" />
          <Typography 
            variant="h6" 
            component="h2"
            sx={{ 
              fontWeight: 600,
              letterSpacing: '-0.5px'
            }}
          >
            তাসবিহ ট্র্যাকার
          </Typography>
        </Stack>
        
        <Button
          variant="outlined"
          startIcon={<AddCircleIcon />}
          onClick={handleOpenDialog}
          size="small"
          sx={{ 
            borderRadius: 'var(--radius-pill)',
            textTransform: 'none',
            px: 2
          }}
        >
          নতুন তাসবিহ
        </Button>
      </Stack>

      {/* Offline indicator */}
      {!onlineStatus && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.85rem' }}>
          আপনি বর্তমানে অফলাইনে আছেন। পরিবর্তনগুলি স্থানীয়ভাবে সংরক্ষণ করা হবে এবং আপনি অনলাইনে ফিরে আসলে সিঙ্ক হবে।
        </Alert>
      )}

      {/* Success and Error messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Conditional content rendering */}
      {tasbeehsLoading && !tasbeehItems.length ? loadingComponent :
       tasbeehsError && !tasbeehItems.length ? errorComponent :
       tasbeehContent}

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
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            নতুন তাসবিহ যোগ করুন
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="তাসবিহের নাম"
            type="text"
            fullWidth
            variant="outlined"
            value={newTasbeehName}
            onChange={(e) => setNewTasbeehName(e.target.value)}
            sx={{ 
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 'var(--radius-md)'
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              textTransform: 'none'
            }}
          >
            বাতিল
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
            {isAdding ? 'যোগ করা হচ্ছে...' : 'যোগ করুন'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tasbeeh Counter Modal */}
      {selectedTasbeeh && counterOpen && (
        <TasbeehCounter
          tasbeeh={selectedTasbeeh.name}
          goal={33} // Default goal
          onClose={handleCloseCounter}
        />
      )}
    </Box>
  );
};

export default TasbeehTracker;
