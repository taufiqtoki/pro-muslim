import React from 'react';
import { TableRow, TableCell, Box, IconButton } from '@mui/material';
import { useDragDrop } from '../../hooks/useDragDrop.ts';
import { Track } from '../../types/playlist.ts';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import LanguageIcon from '@mui/icons-material/Language';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { FavoriteIconComponent } from '../../components/AudioPlayer/FavoriteIconComponent.tsx';
import { formatDuration } from '../../utils/youtube.ts';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface QueueTrackRowProps {
  track: Track;
  index: number;
  currentTrackIndex: number;
  isPlaying: boolean;
  favorites: string[];
  moveTrack: (fromIndex: number, toIndex: number) => void;
  onNameClick: (index: number) => void;
  onToggleFavorite: (trackId: string) => void;
  onRemoveFromQueue: (trackId: string) => void;
}

const QueueTrackRow: React.FC<QueueTrackRowProps> = ({
  track,
  index,
  currentTrackIndex,
  isPlaying,
  favorites,
  moveTrack,
  onNameClick,
  onToggleFavorite,
  onRemoveFromQueue,
}) => {
  const { isDragging, dragRef } = useDragDrop<HTMLTableRowElement>(
    track.id,
    index,
    moveTrack,
    'queue-track'
  );

  // Add click handler with drag protection
  const handleNameClick = (e: React.MouseEvent) => {
    // Prevent click if we just finished dragging
    if (isDragging) {
      e.preventDefault();
      return;
    }
    onNameClick(index);
  };

  return (
    <TableRow
      component="tr"
      ref={dragRef}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: index % 2 === 0 ? 'grey.50' : 'inherit',
        '&:hover': { 
          backgroundColor: index === currentTrackIndex ? 'primary.dark' : 'action.hover' 
        },
        ...(index === currentTrackIndex && { 
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiTableCell-root': {
            color: 'inherit'
          }
        }),
      }}
    >
      <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          animation: index === currentTrackIndex && isPlaying ? 'pulse 1s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.5 },
            '100%': { opacity: 1 },
          }
        }}>
          {index === currentTrackIndex ? (
            <MusicNoteIcon sx={{ color: isPlaying ? 'inherit' : 'text.secondary' }} />
          ) : (
            track.type === 'youtube' ? <LanguageIcon /> : <InsertDriveFileIcon />
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
      <TableCell 
        onClick={handleNameClick} // Use the local handler
        sx={{ 
          py: 1, 
          px: { xs: 0.5, sm: 1 }, 
          typography: 'body2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          '&:hover': { textDecoration: 'underline' }
        }}
      >
        <span>{track.name}</span>
      </TableCell>
      <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>
        {formatDuration(track.duration)}
      </TableCell>
      <TableCell sx={{ p: 0 }}>
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0
        }}>
          <FavoriteIconComponent 
            isFavorite={favorites.includes(track.id)}
            onClick={() => onToggleFavorite(track.id)}
          />
          <IconButton size="small" onClick={() => onRemoveFromQueue(track.id)}>
            <DeleteIcon />
          </IconButton>
          <Box sx={{ display: 'flex', cursor: 'grab', ml: -0.5 }}>
            <DragHandleIcon />
          </Box>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default QueueTrackRow;
