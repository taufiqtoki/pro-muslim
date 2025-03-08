import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  TextField, 
  Button, 
  IconButton,
  Box,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { Tasbeeh } from '../../hooks/useTasbeehs.ts';

interface TasbeehFormData {
  name: string;
  count: string;
}

export const TasbeehSettings = () => {
  const { user } = useAuth();
  const [tasbeehs, setTasbeehs] = useState<Tasbeeh[]>([]);
  const [newTasbeeh, setNewTasbeeh] = useState<TasbeehFormData>({ name: '', count: '' });

  React.useEffect(() => {
    if (!user) return;

    const tasbeehsRef = collection(db, `users/${user.uid}/tasbeehs`);
    const q = query(tasbeehsRef, orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasbeehData: Tasbeeh[] = [];
      snapshot.forEach((doc) => {
        tasbeehData.push({ id: doc.id, ...doc.data() } as Tasbeeh);
      });
      setTasbeehs(tasbeehData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAdd = async () => {
    if (!user || !newTasbeeh.name || !newTasbeeh.count) return;

    try {
      const count = parseInt(newTasbeeh.count);
      if (isNaN(count)) return;

      const tasbeehsRef = collection(db, `users/${user.uid}/tasbeehs`);
      await addDoc(tasbeehsRef, {
        name: newTasbeeh.name,
        count: count,
        order: Date.now() // Use timestamp as order
      });

      setNewTasbeeh({ name: '', count: '' });
    } catch (error) {
      console.error('Error adding tasbeeh:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/tasbeehs`, id));
    } catch (error) {
      console.error('Error deleting tasbeeh:', error);
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Manage Tasbeehs
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Tasbeeh Name"
          value={newTasbeeh.name}
          onChange={(e) => setNewTasbeeh(prev => ({ ...prev, name: e.target.value }))}
          size="small"
        />
        <TextField
          label="Count"
          type="number"
          value={newTasbeeh.count}
          onChange={(e) => setNewTasbeeh(prev => ({ ...prev, count: e.target.value }))}
          size="small"
          sx={{ width: 100 }}
        />
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={handleAdd}
          disabled={!newTasbeeh.name || !newTasbeeh.count}
        >
          Add
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <List>
        {tasbeehs.map((tasbeeh) => (
          <ListItem
            key={tasbeeh.id}
            secondaryAction={
              <IconButton 
                edge="end" 
                aria-label="delete"
                onClick={() => handleDelete(tasbeeh.id)}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <Typography>
              {tasbeeh.name} ({tasbeeh.count})
            </Typography>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
