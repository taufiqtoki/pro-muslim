import React from 'react';
import { Box, Button, Grid } from '@mui/material';

interface SpeedControlsProps {
  onSpeedChange: (speed: number) => void;
}

const SpeedControls: React.FC<SpeedControlsProps> = ({ onSpeedChange }) => {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4];

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={1} justifyContent="center">
        {speeds.map((speed) => (
          <Grid item xs={4} sm={3} md="auto" key={speed}>
            <Button
              onClick={() => onSpeedChange(speed)}
              variant="outlined"
              size="small"
              fullWidth
            >
              {speed}x
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SpeedControls;
