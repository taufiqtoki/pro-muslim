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
      gap: 1,
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
            minWidth: '48px',
            px: 1,
            py: 0.5
          }}
        >
          {speed}x
        </Button>
      ))}
    </Box>
  );
};

export default SpeedControls;
