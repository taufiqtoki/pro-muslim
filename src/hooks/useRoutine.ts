import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { getFromStorage, saveToStorage } from '../utils/localStorage';

// Routine Type Definition
export interface Routine {
  id: string;
  title: string;
  type: string;
  time: string;
  days: string[];
  isActive: boolean;
  description?: string;
}

export const useRoutine = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch routines
  useEffect(() => {
    const fetchRoutines = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Always get from local storage first
        const localRoutines = getFromStorage('routines', []) as Routine[];
        if (localRoutines && localRoutines.length > 0) {
          setRoutines(localRoutines);
        }
        
        // If user is logged in, try to get from Firebase
        if (user && navigator.onLine) {
          try {
            const routinesRef = collection(db, `users/${user.uid}/routines`);
            const snapshot = await getDocs(routinesRef);
            
            if (!snapshot.empty) {
              const firebaseRoutines: Routine[] = [];
              snapshot.forEach((doc) => {
                // Avoid deleted routines
                const data = doc.data();
                if (!data.deleted) {
                  firebaseRoutines.push({ 
                    id: doc.id, 
                    title: data.title || '',
                    type: data.type || '',
                    time: data.time || '',
                    days: data.days || [],
                    isActive: data.isActive ?? true,
                    description: data.description || ''
                  });
                }
              });
              
              // Merge with local routines if needed
              if (firebaseRoutines.length > 0) {
                // Simple merge strategy: use firebase routines, but keep local ones that don't exist in firebase
                const mergedRoutines = [...firebaseRoutines];
                
                // Add local routines that don't exist in firebase
                localRoutines.forEach(localRoutine => {
                  if (!firebaseRoutines.some(fbRoutine => fbRoutine.id === localRoutine.id)) {
                    mergedRoutines.push(localRoutine);
                  }
                });
                
                setRoutines(mergedRoutines);
                saveToStorage('routines', mergedRoutines);
              }
            }
          } catch (firebaseError) {
            console.error('Firebase error fetching routines:', firebaseError);
            // Continue with local routines on firebase error
          }
        }
      } catch (err) {
        console.error('Error in routine hook:', err);
        setError('Failed to load routines. Using locally stored data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoutines();
  }, [user]);

  // Add or update routine
  const saveRoutine = async (routine: Omit<Routine, 'id'> & { id?: string }) => {
    try {
      // Check for required fields
      if (!routine.title || !routine.type || !routine.time || !routine.days) {
        return { success: false, error: 'Missing required fields' };
      }
      
      let newRoutine: Routine;
      const routineId = routine.id || `routine_${Date.now()}`;
      
      if (routine.id) {
        // Update existing routine
        newRoutine = { 
          id: routineId,
          title: routine.title,
          type: routine.type,
          time: routine.time,
          days: routine.days,
          isActive: routine.isActive ?? true,
          description: routine.description || ''
        };
        
        const routineIndex = routines.findIndex(r => r.id === routineId);
        const updatedRoutines = [...routines];
        
        if (routineIndex >= 0) {
          updatedRoutines[routineIndex] = newRoutine;
        } else {
          updatedRoutines.push(newRoutine);
        }
        
        setRoutines(updatedRoutines);
        saveToStorage('routines', updatedRoutines);
      } else {
        // Add new routine
        newRoutine = { 
          id: routineId,
          title: routine.title,
          type: routine.type,
          time: routine.time,
          days: routine.days,
          isActive: routine.isActive ?? true,
          description: routine.description || ''
        };
        
        const updatedRoutines = [...routines, newRoutine];
        setRoutines(updatedRoutines);
        saveToStorage('routines', updatedRoutines);
      }
      
      // If user is logged in, try to sync with Firebase
      if (user && navigator.onLine) {
        try {
          const routineDocRef = doc(db, `users/${user.uid}/routines/${routineId}`);
          await setDoc(routineDocRef, {
            title: newRoutine.title,
            type: newRoutine.type,
            time: newRoutine.time,
            days: newRoutine.days,
            isActive: newRoutine.isActive,
            description: newRoutine.description || '',
            updatedAt: new Date().toISOString()
          });
        } catch (firebaseError) {
          console.error('Firebase error saving routine:', firebaseError);
          // Continue with success since we've already updated local storage
        }
      }
      
      return { success: true, routineId };
    } catch (err) {
      console.error('Error saving routine:', err);
      setError('Failed to save routine. Please try again.');
      return { success: false, error: 'Failed to save routine' };
    }
  };

  // Delete routine
  const deleteRoutine = async (routineId: string) => {
    try {
      const updatedRoutines = routines.filter(r => r.id !== routineId);
      setRoutines(updatedRoutines);
      saveToStorage('routines', updatedRoutines);
      
      // If user is logged in, try to delete from Firebase
      if (user && navigator.onLine) {
        try {
          const routineDocRef = doc(db, `users/${user.uid}/routines/${routineId}`);
          await setDoc(routineDocRef, { 
            deleted: true,
            deletedAt: new Date().toISOString() 
          }, { merge: true });
        } catch (firebaseError) {
          console.error('Firebase error deleting routine:', firebaseError);
          // Continue with success since we've already updated local storage
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting routine:', err);
      setError('Failed to delete routine. Please try again.');
      return { success: false, error: 'Failed to delete routine' };
    }
  };

  return {
    routines,
    loading,
    error,
    saveRoutine,
    deleteRoutine
  };
}; 