import React, { useState } from 'react';
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
  CircularProgress
} from '@mui/material';
import { ReorderableList } from './ReorderableList';
import { Tasbeeh } from '../hooks/useTasbeehs';
import { useReorderableList } from '../hooks/useReorderableList';
import { useAuth } from '../hooks/useAuth';
import TimelineIcon from '@mui/icons-material/Timeline';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CountertopsIcon from '@mui/icons-material/Countertops';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

interface TasbeehTrackerProps {
  tasbeehs: Tasbeeh[];
}

const TasbeehTracker: React.FC<TasbeehTrackerProps> = ({ tasbeehs }) => {
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [newTasbeehName, setNewTasbeehName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const {
    items,
    handleReorder,
    saveReorder,
    cancelReorder,
    hasChanges,
    isSaving,
    setItems
  } = useReorderableList<Tasbeeh>(
    tasbeehs,
    `users/${user?.uid}/tasbeehs`
  );

  // Add wrapper function to handle index-based reordering
  const handleReorderByIndex = (startIndex: number, endIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, movedItem);
    handleReorder(newItems);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewTasbeehName('');
  };

  const handleAddTasbeeh = async () => {
    if (!user || !newTasbeehName.trim()) return;
    
    setIsAdding(true);
    try {
      const newTasbeeh: Tasbeeh = {
        id: uuidv4(),
        name: newTasbeehName.trim(),
        count: 0,
        order: items.length,
        createdAt: new Date().toISOString()
      };
      
      // Add to Firestore
      if (items.length === 0) {
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
      
      // Update local state
      setItems([...items, newTasbeeh]);
      handleCloseDialog();
    } catch (error) {
      console.error('Error adding tasbeeh:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const renderTasbeeh = (tasbeeh: Tasbeeh) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderRadius: 'var(--radius-md)',
        bgcolor: 'background.paper',
        width: '100%'
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
            Total Count: {tasbeeh.count}
          </Typography>
        }
      />
      <Chip 
        label={`${tasbeeh.count}`} 
        color="primary" 
        size="small"
        sx={{ 
          borderRadius: 'var(--radius-pill)',
          minWidth: 40,
          fontWeight: 600
        }}
      />
    </Box>
  );

  return (
    <Box>
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ mb: 3 }}
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
            Tasbeeh Tracker
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
          New Tasbeeh
        </Button>
      </Stack>

      {items.length === 0 ? (
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
            Your Tasbeeh list is empty
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddCircleIcon />}
            onClick={handleOpenDialog}
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              textTransform: 'none'
            }}
          >
            Add First Tasbeeh
          </Button>
        </Box>
      ) : (
        <ReorderableList
          items={items}
          onReorder={handleReorderByIndex}
          onSave={saveReorder}
          onCancel={cancelReorder}
          hasChanges={hasChanges}
          isSaving={isSaving}
          renderItem={renderTasbeeh}
        />
      )}

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
    </Box>
  );
};

export default TasbeehTracker;
