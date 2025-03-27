import React from 'react';
import { ListItemText } from '@mui/material';
import { ReorderableList } from './ReorderableList.tsx';
import { Tasbeeh } from '../hooks/useTasbeehs.ts';
import { useReorderableList } from '../hooks/useReorderableList.ts';
import { useAuth } from '../hooks/useAuth.ts';

interface TasbeehTrackerProps {
  tasbeehs: Tasbeeh[];
}

const TasbeehTracker: React.FC<TasbeehTrackerProps> = ({ tasbeehs }) => {
  const { user } = useAuth();
  const {
    items,
    handleReorder,
    saveReorder,
    cancelReorder,
    hasChanges,
    isSaving
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

  const renderTasbeeh = (tasbeeh: Tasbeeh) => (
    <ListItemText 
      primary={tasbeeh.name}
      secondary={`Count: ${tasbeeh.count}`}
    />
  );

  return (
    <ReorderableList
      items={items}
      onReorder={handleReorderByIndex} // Use the new wrapper function
      onSave={saveReorder}
      onCancel={cancelReorder}
      hasChanges={hasChanges}
      isSaving={isSaving}
      renderItem={renderTasbeeh}
    />
  );
};

export default TasbeehTracker;
