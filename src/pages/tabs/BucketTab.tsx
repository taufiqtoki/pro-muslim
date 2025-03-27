import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, IconButton, Checkbox, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Typography, List, ListItem
} from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { AutosuggestInput } from '../../components/AutosuggestInput.tsx';
import ReusableTable from '../../components/ReusableTable.tsx';
import { useDragDrop } from '../../hooks/useDragDrop.ts';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface BucketItem {
  id: string;
  description: string;
  completed: boolean;
  order: number;
}

const BucketTab: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BucketItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [editItem, setEditItem] = useState<BucketItem | null>(null);

  // Load user's bucket items
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // First, ensure the user's bucket collection exists
        const userBucketRef = doc(db, `users/${user.uid}/bucketLists/default`);
        await setDoc(userBucketRef, { createdAt: new Date() }, { merge: true });

        // Then set up the listener
        const q = query(collection(db, `users/${user.uid}/bucketLists/default/items`), orderBy('order'));
        return onSnapshot(q, (snapshot) => {
          const newItems: BucketItem[] = [];
          snapshot.forEach((doc) => {
            newItems.push({ id: doc.id, ...doc.data() } as BucketItem);
          });
          setItems(newItems);
        });
      } catch (error) {
        console.error('Error setting up bucket list:', error);
      }
    };

    fetchData();
  }, [user]);

  // Load shared suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      const q = query(collection(db, 'sharedBucketItems'));
      const snapshot = await getDocs(q);
      const suggestions = snapshot.docs.map(doc => doc.data().description);
      setSuggestions(suggestions);
    };
    loadSuggestions();
  }, []);

  const handleAddItem = async (description: string) => {
    if (!user || !description.trim()) return;

    try {
      const itemRef = collection(db, `users/${user.uid}/bucketLists/default/items`);
      // Get the highest order number or 0 if no items exist
      const maxOrder = items.reduce((max, item) => Math.max(max, item.order), -1);
      
      await addDoc(itemRef, {
        description: description.trim(),
        completed: false,
        order: maxOrder + 1, // Always add to bottom
        createdAt: new Date()
      });

      // Add to shared suggestions if new
      const sharedRef = collection(db, 'sharedBucketItems');
      await addDoc(sharedRef, {
        description: description.trim(),
        createdAt: new Date(),
        addedBy: user.uid
      });
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleEdit = async (item: BucketItem) => {
    if (!user || !editItem) return;
    
    try {
      await updateDoc(doc(db, `users/${user.uid}/bucketLists/default/items`, item.id), {
        description: editItem.description
      });
      setEditItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, `users/${user.uid}/bucketLists/default/items`, id));
      
      // No need to reorder remaining items
      // When item is re-added, it will go to the bottom with a new order number
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems.map((item, index) => ({ ...item, order: index })));
  };

  const handleToggle = (id: string) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, completed: !item.completed }
        : item
    ).sort((a, b) => {
      // Move completed items to bottom
      if (a.completed === b.completed) return a.order - b.order;
      return a.completed ? 1 : -1;
    }));
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);
  };

  const renderItem = (item: BucketItem, index: number) => {
    const { isDragging, dragRef } = useDragDrop<HTMLDivElement>(
      `bucket-${item.id}`, 
      index, 
      moveItem,
      'bucket-item'
    );

    return (
      <ListItem
        ref={dragRef}
        key={item.id}
        component="div"
        sx={{
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
          display: 'flex',
          alignItems: 'center',
          padding: 1,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <DragIndicatorIcon sx={{ mr: 1, cursor: 'grab' }} />
        <Typography>{item.description}</Typography> {/* Fixed property name */}
        <IconButton onClick={() => handleDelete(item.id)}>
          <DeleteIcon />
        </IconButton>
      </ListItem>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5">Bucket List</Typography>
        <Paper sx={{ mb: 2, p: 2 }}>
          <AutosuggestInput
            suggestions={suggestions}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(value) => {
              handleAddItem(value);
              setInputValue('');
            }}
            placeholder="Add new bucket list item..."
            label="New Bucket List Item"
          />
        </Paper>

        <List>
          {items.map((item, index) => renderItem(item, index))}
        </List>

        <Dialog open={!!editItem} onClose={() => setEditItem(null)}>
          <DialogTitle>Edit Bucket Item</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Description"
              fullWidth
              value={editItem?.description || ''}
              onChange={(e) => setEditItem(prev => prev ? {...prev, description: e.target.value} : null)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={() => editItem && handleEdit(editItem)} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DndProvider>
  );
};

export default BucketTab;
