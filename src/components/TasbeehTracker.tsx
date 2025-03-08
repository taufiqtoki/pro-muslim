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
    items,                 // Use items instead of input tasbeehs
    handleReorder,
    saveReorder,
    cancelReorder,
    hasChanges,
    isSaving
  } = useReorderableList<Tasbeeh>(
    tasbeehs,
    `users/${user?.uid}/tasbeehs`
  );

  const renderTasbeeh = (tasbeeh: Tasbeeh) => (
    <ListItemText 
      primary={tasbeeh.name}
      secondary={`Count: ${tasbeeh.count}`}
    />
  );

  return (
    <ReorderableList
      items={items}        // Use items from hook instead of props
      onReorder={handleReorder}
      onSave={saveReorder}
      onCancel={cancelReorder}
      hasChanges={hasChanges}
      isSaving={isSaving}
      renderItem={renderTasbeeh}
    />
  );
};

export default TasbeehTracker;
