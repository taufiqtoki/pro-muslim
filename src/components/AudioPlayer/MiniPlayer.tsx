import React from 'react';
import { Box, IconButton, Typography, Paper, Slider } from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { Track } from '../../types/playlist';

interface MiniPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onMaximize: () => void;
  onSeek: (value: number) => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onMaximize,
  onSeek,
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '300px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        padding: 1,
        gap: 1,
        zIndex: 1000,
        backgroundColor: 'background.paper',
      }}
    >
      {track?.thumbnail && (
        <Box
          component="img"
          src={track.thumbnail}
          alt="Track thumbnail"
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            objectFit: 'cover',
          }}
        />
      )}
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
          {track?.name || 'No track playing'}
        </Typography>
        
        <Slider
          size="small"
          value={currentTime}
          max={duration || 100}
          onChange={(_, value) => onSeek(value as number)}
          sx={{
            height: 4,
            '& .MuiSlider-thumb': {
              width: 8,
              height: 8,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: 'none',
              }
            }
          }}
        />
      </Box>

      <IconButton size="small" onClick={onPlayPause}>
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>

      <IconButton size="small" onClick={onMaximize}>
        <OpenInFullIcon />
      </IconButton>
    </Paper>
  );
};

export default MiniPlayer;
