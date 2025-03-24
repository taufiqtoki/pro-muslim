import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Forward10Icon from '@mui/icons-material/Forward10';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward30Icon from '@mui/icons-material/Forward30';
import Replay30Icon from '@mui/icons-material/Replay30';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { RepeatMode } from '../../types/player';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  repeatMode: RepeatMode;
  onRepeatModeChange: (mode: RepeatMode) => void;
  isShuffled: boolean;               // Add this line
  onShuffleToggle: () => void;      // Add this line
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  repeatMode,
  onRepeatModeChange,
  isShuffled,         // Add this
  onShuffleToggle,    // Add this
}) => {
  const getNextRepeatMode = (current: RepeatMode): RepeatMode => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(current);
    return modes[(currentIndex + 1) % modes.length];
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one': return <RepeatOneIcon />;
      case 'all': return <RepeatIcon color="primary" />;
      default: return <RepeatIcon />;
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: 'fit-content',
      margin: '0 auto',
      gap: 0.5,
    }}>
      <IconButton onClick={() => onSeek(-30)} size="small" title="Back 30s">
        <Replay30Icon />
      </IconButton>
      <IconButton onClick={() => onSeek(-10)} size="small" title="Back 10s">
        <Replay10Icon />
      </IconButton>
      <IconButton onClick={onPrevious} sx={{ p: 0.5 }}>
        <SkipPreviousIcon />
      </IconButton>
      <IconButton onClick={onPlayPause} sx={{ 
        mx: 0, // Remove margin
        p: 0.5, // Reduce padding
        '& .MuiSvgIcon-root': {
          fontSize: 35 // Slightly reduce icon size
        }
      }}>
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton onClick={onNext} sx={{ p: 0.5 }}>
        <SkipNextIcon />
      </IconButton>
      <IconButton onClick={() => onSeek(10)} size="small" title="Forward 10s">
        <Forward10Icon />
      </IconButton>
      <IconButton onClick={() => onSeek(30)} size="small" title="Forward 30s">
        <Forward30Icon />
      </IconButton>
      <Tooltip title={`Repeat: ${repeatMode}`}>
        <IconButton onClick={() => onRepeatModeChange(getNextRepeatMode(repeatMode))}>
          {getRepeatIcon()}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default PlaybackControls;
