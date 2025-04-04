import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, setDoc, FirestoreError } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { useAuth } from './useAuth.ts';

export interface Tasbeeh {
  id: string;
  name: string;
  count: number;
  goal?: number;
  order: number;
  createdAt?: string;
}

export const useTasbeehs = () => {
  const [tasbeehs, setTasbeehs] = useState<Tasbeeh[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const initializeDefaultTasbeehs = useCallback(async () => {
    if (!user || tasbeehs.length > 0 || loading) return;

    try {
      const defaults = [
        { id: '1', name: 'Subhanallah', count: 0, goal: 33, order: 0 },
        { id: '2', name: 'Alhamdulillah', count: 0, goal: 33, order: 1 },
        { id: '3', name: 'Allahu Akbar', count: 0, goal: 34, order: 2 }
      ];

      await Promise.all(
        defaults.map(tasbeeh => 
          setDoc(doc(db, `users/${user.uid}/tasbeehs`, tasbeeh.id), tasbeeh)
        )
      );
    } catch (err) {
      console.error('Init error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
    }
  }, [user, loading, tasbeehs.length]);

  useEffect(() => {
    if (!user) {
      setTasbeehs([]);
      setLoading(false);
      return;
    }

    const userTasbeehsRef = collection(db, `users/${user.uid}/tasbeehs`);
    const q = query(userTasbeehsRef, orderBy('order', 'asc'));
    
    try {
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          if (snapshot.empty) {
            initializeDefaultTasbeehs();
          }
          const tasbeehData: Tasbeeh[] = [];
          snapshot.forEach((doc) => {
            tasbeehData.push({ id: doc.id, ...doc.data() } as Tasbeeh);
          });
          setTasbeehs(tasbeehData);
          setLoading(false);
        }, 
        (err: FirestoreError) => {
          console.error('Firestore error:', err);
          setError(`Firestore error: ${err.message}`);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Firestore setup error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [user, initializeDefaultTasbeehs]);

  const handleReorder = async (newTasbeehs: Tasbeeh[]) => {
    if (!user) return;
    
    try {
      const batch = newTasbeehs.map((tasbeeh, index) => 
        updateDoc(doc(db, `users/${user.uid}/tasbeehs`, tasbeeh.id), {
          order: index
        })
      );
      await Promise.all(batch);
    } catch (err) {
      console.error('Reorder error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    }
  };

  useEffect(() => {
    const initAndLoad = async () => {
      if (user) {
        await initializeDefaultTasbeehs();
      }
    };
    
    initAndLoad();
  }, [user, loading, initializeDefaultTasbeehs]); // Add proper dependency

  return { tasbeehs, handleReorder, loading, error };
};
