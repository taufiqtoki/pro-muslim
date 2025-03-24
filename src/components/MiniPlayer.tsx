import React from 'react';
import { Box, IconButton, Typography, Paper, LinearProgress, Stack } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext.tsx';

const MiniPlayer: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isPlaying, 
    currentTrack, 
    currentTime, 
    duration, 
    togglePlay, 
    handleNextTrack, 
    handlePreviousTrack
  } = usePlayer();

  const progress = (currentTime / duration) * 100 || 0;

  return (
    <Paper elevation={3} sx={{ p: 1, position: 'relative', height: '72px' }}>
      <Box sx={{ display: 'flex', gap: 1, height: '100%' }}>
        <Box
          component="img"
          src={currentTrack?.thumbnail || '/placeholder-image.jpg'}
          alt={currentTrack?.name || 'No track selected'}
          sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover' }}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography noWrap variant="body2">
            {currentTrack?.name || 'No track selected'}
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small" onClick={handlePreviousTrack}>
              <SkipPreviousIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={togglePlay}>
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={handleNextTrack}>
              <SkipNextIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => navigate('/player')}>
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
        }}
      />
    </Paper>
  );
};

export default MiniPlayer;
