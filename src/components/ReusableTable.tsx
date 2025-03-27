import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { useDragDrop } from '../hooks/useDragDrop';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
}

interface ReusableTableProps {
  columns: Column[];
  rows: any[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  isDraggable?: boolean;
}

const ReusableTable: React.FC<ReusableTableProps> = ({
  columns,
  rows,
  onReorder,
  isDraggable = false
}) => {
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (onReorder) {
      onReorder(fromIndex, toIndex);
    }
  };

  const tableContent = (
    <TableContainer component={Paper}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const { isDragging, dragRef } = isDraggable 
              ? useDragDrop(`row-${index}`, index, moveItem)
              : { isDragging: false, dragRef: null };

            return (
              <TableRow
                ref={dragRef}
                key={index}
                sx={{
                  opacity: isDragging ? 0.5 : 1,
                  cursor: isDraggable ? 'move' : 'default'
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {row[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return isDraggable ? (
    <DndProvider backend={HTML5Backend}>
      {tableContent}
    </DndProvider>
  ) : tableContent;
};

export default ReusableTable;
