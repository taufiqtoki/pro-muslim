import { useRef, useState } from 'react';
import { DragSourceMonitor, useDrag, useDrop } from 'react-dnd';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export const useDragDrop = <T extends HTMLElement = HTMLTableRowElement>(
  id: string, 
  index: number, 
  moveItem: (fromIndex: number, toIndex: number) => void,
  type = 'row' // Removed redundant type annotation
) => {
  const ref = useRef<T>(null);
  const [, drop] = useDrop({
    accept: type,
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type,
    item: { type, id, index },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return {
    isDragging,
    dragRef: ref,
  };
};

// For file drop handling
export const useFileDrop = () => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (
    e: React.DragEvent,
    onFileDrop: (files: FileList) => void,
    onUrlDrop?: (url: string) => void
  ) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files?.length > 0) {
      onFileDrop(e.dataTransfer.files);
    } else if (onUrlDrop) {
      const url = e.dataTransfer.getData('text');
      if (url) {
        onUrlDrop(url);
      }
    }
  };

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
