import React, { useState, useEffect } from 'react';
import { Box, Slider, IconButton, Tooltip } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (newVolume: number) => void;
  onMute: () => void;
  isMuted: boolean;
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  onMute,
  isMuted
}) => {
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [volumeTimeout, setVolumeTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle mouse enter/leave for volume slider
  const handleVolumeMouseEnter = () => {
    if (volumeTimeout) {
      clearTimeout(volumeTimeout);
      setVolumeTimeout(null);
    }
    setIsVolumeOpen(true);
  };

  const handleVolumeMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsVolumeOpen(false);
    }, 1000);
    setVolumeTimeout(timeout as unknown as NodeJS.Timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (volumeTimeout) {
        clearTimeout(volumeTimeout);
      }
    };
  }, [volumeTimeout]);

  // Get appropriate volume icon based on volume level
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeOffIcon />;
    } else if (volume < 30) {
      return <VolumeMuteIcon />;
    } else if (volume < 70) {
      return <VolumeDownIcon />;
    } else {
      return <VolumeUpIcon />;
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        position: 'relative',
        mr: 1
      }}
      onMouseEnter={handleVolumeMouseEnter}
      onMouseLeave={handleVolumeMouseLeave}
    >
      <Tooltip title={isMuted ? "Unmute" : "Mute"}>
        <IconButton onClick={onMute} size="small">
          {getVolumeIcon()}
        </IconButton>
      </Tooltip>
      
      {isVolumeOpen && (
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: '100%', 
            left: 0, 
            width: 120, 
            height: 36, 
            bgcolor: 'background.paper', 
            borderRadius: 1,
            boxShadow: 3,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <Slider
            value={isMuted ? 0 : volume}
            onChange={(_, newValue) => onVolumeChange(newValue as number)}
            aria-labelledby="volume-slider"
            size="small"
            min={0}
            max={100}
            sx={{ mx: 1 }}
          />
        </Box>
      )}
    </Box>
  );
};

export default VolumeControl; 