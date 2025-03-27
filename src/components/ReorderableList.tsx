import React from 'react';
import { List, ListItem, Box, Button } from '@mui/material';
import { useDragDrop } from '../hooks/useDragDrop.ts';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface ReorderableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (startIndex: number, endIndex: number) => void;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
  hasChanges?: boolean;
  isSaving?: boolean;
}

export const ReorderableList = <T,>({ 
  items, 
  renderItem, 
  onReorder,
  onSave,
  onCancel,
  hasChanges,
  isSaving 
}: ReorderableListProps<T>) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <List>
        {items.map((item, index) => {
          const { isDragging, dragRef } = useDragDrop(`item-${index}`, index, onReorder);
          
          return (
            <Box
              ref={dragRef}
              key={index}
              sx={{
                opacity: isDragging ? 0.5 : 1,
                cursor: 'move',
              }}
            >
              {renderItem(item, index)}
            </Box>
          );
        })}
      </List>
      {/* Add optional save/cancel buttons */}
      {hasChanges && onSave && onCancel && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving} variant="contained" color="primary">
            Save Changes
          </Button>
        </Box>
      )}
    </DndProvider>
  );
};

export default ReorderableList;
