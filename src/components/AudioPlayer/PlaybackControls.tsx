import React from 'react';
import { Box, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Forward10Icon from '@mui/icons-material/Forward10';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward30Icon from '@mui/icons-material/Forward30';
import Replay30Icon from '@mui/icons-material/Replay30';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
}) => {
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: 'fit-content',
      margin: '0 auto',
      gap: 0.5, // Reduced gap between all buttons
    }}>
      {/* All controls in one line */}
      <IconButton onClick={() => onSeek(-30)} size="small" title="Back 30s">
        <Replay30Icon />
      </IconButton>
      <IconButton onClick={() => onSeek(-10)} size="small" title="Back 10s">
        <Replay10Icon />
      </IconButton>
      <IconButton onClick={onPrevious}>
        <SkipPreviousIcon />
      </IconButton>
      <IconButton onClick={onPlayPause} sx={{ mx: 0.5 }}>
        {isPlaying ? <PauseIcon sx={{ fontSize: 38 }} /> : <PlayArrowIcon sx={{ fontSize: 38 }} />}
      </IconButton>
      <IconButton onClick={onNext}>
        <SkipNextIcon />
      </IconButton>
      <IconButton onClick={() => onSeek(10)} size="small" title="Forward 10s">
        <Forward10Icon />
      </IconButton>
      <IconButton onClick={() => onSeek(30)} size="small" title="Forward 30s">
        <Forward30Icon />
      </IconButton>
    </Box>
  );
};

export default PlaybackControls;
