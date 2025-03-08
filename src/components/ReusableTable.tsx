import React from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Checkbox, IconButton 
} from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ReusableTableProps {
  items: any[];
  onToggle: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onDragEnd: (result: any) => void;
  setEditItem: (item: any | null) => void;
}

const ReusableTable: React.FC<ReusableTableProps> = ({ items, onToggle, onEdit, onDelete, onDragEnd, setEditItem }) => {
  return (
    <TableContainer component={Paper}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell width={40}>#</TableCell>
              <TableCell>Description</TableCell>
              <TableCell width={80}>Status</TableCell>
              <TableCell width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <Droppable droppableId="reusable-table">
            {(provided) => (
              <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{
                          height: 40,
                          background: snapshot.isDragging ? '#f5f5f5' : 'inherit',
                          '& td': {
                            textDecoration: item.completed ? 'line-through' : 'none',
                            color: item.completed ? 'text.disabled' : 'inherit'
                          }
                        }}
                      >
                        <TableCell {...provided.dragHandleProps}>
                          <DragHandleIcon />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={item.completed}
                            onChange={() => onToggle(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            onClick={() => setEditItem(item)}
                            disabled={item.completed}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => onDelete(item.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </DragDropContext>
    </TableContainer>
  );
};

export default ReusableTable;
