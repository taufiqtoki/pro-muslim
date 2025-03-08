import { useState, useCallback } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase.ts';

interface Orderable {
  id: string;
  order: number;
}

export function useReorderableList<T extends Orderable>(
  initialItems: T[],
  collectionPath: string,
  onError?: (error: string) => void
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingChanges, setPendingChanges] = useState<T[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleReorder = useCallback((newItems: T[]) => {
    setItems(newItems);
    setPendingChanges(newItems);
  }, []);

  const saveReorder = useCallback(async () => {
    if (!pendingChanges.length) return;
    
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      
      pendingChanges.forEach((item, index) => {
        const ref = doc(db, collectionPath, item.id);
        batch.update(ref, { order: index });
      });
      
      await batch.commit();
      setPendingChanges([]);
    } catch (err) {
      console.error('Save reorder error:', err);
      onError?.(err instanceof Error ? err.message : 'Failed to save order');
      // Revert to last saved state
      setItems(initialItems);
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, collectionPath, initialItems, onError]);

  const cancelReorder = useCallback(() => {
    setItems(initialItems);
    setPendingChanges([]);
  }, [initialItems]);

  return {
    items,
    isSaving,
    hasChanges: pendingChanges.length > 0,
    handleReorder,
    saveReorder,
    cancelReorder
  };
}
