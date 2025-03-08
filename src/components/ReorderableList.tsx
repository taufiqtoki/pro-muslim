import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { List, ListItem, IconButton, Stack, Paper, Button, CircularProgress } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';

interface Orderable {
  id: string;
  order: number;
}

interface ReorderableListProps<T extends Orderable> {
  items: T[];
  onReorder: (items: T[]) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  hasChanges?: boolean;
  isSaving?: boolean;
  renderItem: (item: T) => React.ReactNode;
}

export function ReorderableList<T extends Orderable>({
  items,
  onReorder,
  onSave,
  onCancel,
  hasChanges = false,
  isSaving = false,
  renderItem
}: ReorderableListProps<T>) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    onReorder(newItems);
  };

  return (
    <Paper sx={{ m: 2, p: 2 }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="reorderable-list">
          {(provided) => (
            <List {...provided.droppableProps} ref={provided.innerRef}>
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <ListItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        border: '1px solid #eee',
                        mb: 1,
                        borderRadius: 1,
                        background: snapshot.isDragging ? '#f5f5f5' : 'white'
                      }}
                    >
                      {renderItem(item)}
                      <IconButton {...provided.dragHandleProps}>
                        <DragHandleIcon />
                      </IconButton>
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>
      
      {hasChanges && (
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <IconButton onClick={onCancel} color="error" disabled={isSaving}>
            <CloseIcon />
          </IconButton>
          <Button
            onClick={onSave}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
            variant="contained"
            color="primary"
          >
            Save Order
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
