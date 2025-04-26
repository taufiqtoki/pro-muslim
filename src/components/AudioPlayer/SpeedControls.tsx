import React from 'react';
import { Box, Button } from '@mui/material';

interface SpeedControlsProps {
  onSpeedChange: (speed: number) => void;
}

const SpeedControls: React.FC<SpeedControlsProps> = ({ onSpeedChange }) => {
  const speeds = [0.75, 1, 1.25, 1.5, 2, 3];

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 0.5, // Reduced gap between buttons
      width: 'fit-content',
      margin: '0 auto',
      minWidth: 'min-content'
    }}>
      {speeds.map((speed) => (
        <Button
          key={speed}
          onClick={() => onSpeedChange(speed)}
          variant="outlined"
          size="small"
          sx={{
            minWidth: '40px', // Reduced from 48px
            px: 0.5, // Reduced horizontal padding
            py: 0.5,
            fontSize: '0.75rem' // Smaller font size
          }}
        >
          {speed}x
        </Button>
      ))}
    </Box>
  );
};

export default SpeedControls;
