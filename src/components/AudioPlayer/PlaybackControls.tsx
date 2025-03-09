import React from 'react';
import { Box, IconButton, Grid } from '@mui/material';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

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
  onSeek
}) => {
  const seekButtons = [
    { label: '-3m', value: -180 },
    { label: '-1m', value: -60 },
    { label: '-30s', value: -30 },
    { label: '-10s', value: -10 },
    { label: '+10s', value: 10 },
    { label: '+30s', value: 30 },
    { label: '+1m', value: 60 },
    { label: '+3m', value: 180 },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={1} justifyContent="center" alignItems="center">
        <Grid item>
          <IconButton onClick={onPrevious}>
            <SkipPreviousIcon />
          </IconButton>
        </Grid>
        {seekButtons.map((btn, index) => (
          <Grid item key={btn.label} sx={{ display: { xs: index > 3 && index < 6 ? 'none' : 'block', sm: 'block' } }}>
            <IconButton onClick={() => onSeek(btn.value)}>
              {btn.label}
            </IconButton>
          </Grid>
        ))}
        <Grid item>
          <IconButton onClick={onPlayPause}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Grid>
        <Grid item>
          <IconButton onClick={onNext}>
            <SkipNextIcon />
          </IconButton>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PlaybackControls;
