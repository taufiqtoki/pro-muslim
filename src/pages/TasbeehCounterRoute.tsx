import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TasbeehCounter from '../components/TasbeehCounter';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/localStorage';

interface TasbeehLocationState {
  tasbeeh: string;
  goal: number;
  id: string;
  currentCount: number;
}

const TasbeehCounterRoute: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [isSaving, setIsSaving] = useState(false);
  
  // Get data from location state
  const state = location.state as TasbeehLocationState;
  
  if (!state || !state.tasbeeh) {
    // If no data in state, redirect back to home
    useEffect(() => {
      navigate('/');
    }, [navigate]);
    
    return null;
  }
  
  const handleClose = async (count: number) => {
    if (count === state.currentCount) {
      navigate(-1);
      return;
    }
    
    // Always save to local storage first for immediate feedback
    const storedTasbeehs = getFromStorage<any[]>(STORAGE_KEYS.TASBEEHS, []);
    const updatedTasbeehs = storedTasbeehs.map(t => 
      t.id === id ? { ...t, count } : t
    );
    saveToStorage(STORAGE_KEYS.TASBEEHS, updatedTasbeehs);
    
    // Start navigating back immediately
    navigate(-1);
    
    // Save to Firestore in background if online and user is logged in
    if (user && id) {
      try {
        // Update the tasbeeh count in Firestore without awaiting
        updateDoc(doc(db, `users/${user.uid}/tasbeehs`, id), {
          count: count
        }).catch(err => {
          console.error('Background save error:', err);
          // Error is non-blocking since we already saved to local storage
        });
      } catch (error) {
        console.error('Error setting up Firestore update:', error);
        // Even if this fails, local storage has the data
      }
    }
  };
  
  return (
    <TasbeehCounter 
      tasbeeh={state.tasbeeh}
      goal={state.goal}
      initialCount={state.currentCount}
      onClose={handleClose}
    />
  );
};

export default TasbeehCounterRoute; 