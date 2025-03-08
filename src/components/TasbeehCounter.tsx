import React, { useState } from 'react';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface TasbeehCounterProps {
  tasbeeh: string;
  goal: number;
  onClose: (count: number) => void;
}

const TasbeehCounter: React.FC<TasbeehCounterProps> = ({ tasbeeh, goal, onClose }) => {
  const [count, setCount] = useState(0);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  return (
    <Dialog open fullScreen>
      <DialogTitle>
        {tasbeeh}
        <IconButton
          aria-label="close"
          onClick={() => onClose(count)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh', 
            bgcolor: isDark ? '#000000' : '#ffffff' 
          }}
        >
          <Typography 
            variant="h1" 
            sx={{ 
              color: isDark ? '#ffffff' : '#000000', 
              mb: 2 
            }}
          >
            {count}
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleIncrement} 
            sx={{ 
              bgcolor: isDark ? '#ffffff' : '#000000', 
              color: isDark ? '#000000' : '#ffffff', 
              width: 200, 
              height: 200, 
              borderRadius: '50%', 
              fontSize: '2rem' 
            }}
          >
            +
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset} color="secondary">
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TasbeehCounter;
