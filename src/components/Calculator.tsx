import React, { useState, useEffect } from 'react';
import { Box, Button, Grid, Typography, useTheme } from '@mui/material';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('');
  const [result, setResult] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleButtonClick = (value: string) => {
    if (isCalculated) return;
    setDisplay(prev => {
      const newDisplay = prev + value;
      autoCalculate(newDisplay);
      return newDisplay;
    });
  };

  const handleClear = () => {
    setDisplay('');
    setResult('');
    setIsCalculated(false);
  };

  const handleBackspace = () => {
    if (isCalculated) return;
    setDisplay(prev => {
      const newDisplay = prev.slice(0, -1);
      autoCalculate(newDisplay);
      return newDisplay;
    });
  };

  const handleCalculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const evalResult = eval(display.replace(/[+\-*/]$/, ''));
      setResult(evalResult.toString());
      setIsCalculated(true);
    } catch {
      setResult('Error');
    }
  };

  const autoCalculate = (expression: string) => {
    try {
      // eslint-disable-next-line no-eval
      const evalResult = eval(expression.replace(/[+\-*/]$/, ''));
      setResult(evalResult.toString());
    } catch {
      setResult('');
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      handleCalculate();
    } else if (key === 'Escape' || key.toLowerCase() === 'c') {
      handleClear();
    } else if (key === 'Backspace') {
      handleBackspace();
    } else if (/[0-9+\-*/.%]/.test(key)) {
      handleButtonClick(key);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <Box 
      sx={{ 
        p: 2, 
        bgcolor: isDark ? 'grey.900' : 'grey.100', 
        borderRadius: 2,
        maxWidth: '350px', 
        position: 'relative' 
      }}
    >
      {/* Display Area */}
      <Box
        sx={{
          mb: 1,
          p: 1,
          bgcolor: isDark ? 'grey.800' : 'grey.200',
          borderRadius: 1,
          minHeight: '40px', 
          overflowY: 'auto', // Add vertical scrollbar
          textAlign: 'right', 
          display: 'flex',
          alignItems: 'right',
          justifyContent: 'flex-end',
          flexDirection: 'column', // Allow multiple lines
        }}
      >
        <Typography
          variant="h6" 
          sx={{
            wordWrap: 'break-word', 
            whiteSpace: 'pre-wrap', 
            fontSize: display.length > 10 ? '1rem' : '1.5rem', 
            lineHeight: '1.2', 
          }}
        >
          {display}
        </Typography>
      </Box>
      <Box
        sx={{
          mb: 2,
          p: 1,
          bgcolor: isDark ? 'grey.800' : 'grey.200',
          borderRadius: 1,
          minHeight: '40px', 
          overflowY: 'auto', // Add vertical scrollbar
          textAlign: 'right', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Typography
          variant="h4" 
          sx={{
            wordWrap: 'break-word', 
            whiteSpace: 'pre-wrap', 
            fontSize: result.length > 10 ? '1rem' : '1.5rem', 
            lineHeight: '1.2', 
          }}
        >
          {result}
        </Typography>
      </Box>

      {/* Buttons */}
      <Grid container spacing={1}>
        {['7', '8', '9', '/'].map((value) => (
          <Grid item xs={3} key={value}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => handleButtonClick(value)}
              sx={{ 
                bgcolor: isDark ? 'grey.700' : 'grey.300', 
                color: isDark ? 'white' : 'black' 
              }}
            >
              {value}
            </Button>
          </Grid>
        ))}
        {['4', '5', '6', '*'].map((value) => (
          <Grid item xs={3} key={value}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => handleButtonClick(value)}
              sx={{ 
                bgcolor: isDark ? 'grey.700' : 'grey.300', 
                color: isDark ? 'white' : 'black' 
              }}
            >
              {value}
            </Button>
          </Grid>
        ))}
        {['1', '2', '3', '-'].map((value) => (
          <Grid item xs={3} key={value}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => handleButtonClick(value)}
              sx={{ 
                bgcolor: isDark ? 'grey.700' : 'grey.300', 
                color: isDark ? 'white' : 'black' 
              }}
            >
              {value}
            </Button>
          </Grid>
        ))}
        {['0', '00', '.', '+'].map((value) => (
          <Grid item xs={3} key={value}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => handleButtonClick(value)}
              sx={{ 
                bgcolor: isDark ? 'grey.700' : 'grey.300', 
                color: isDark ? 'white' : 'black' 
              }}
            >
              {value}
            </Button>
          </Grid>
        ))}
        <Grid item xs={6}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={handleClear}
            sx={{ 
              bgcolor: isDark ? 'grey.700' : 'grey.300', 
              color: isDark ? 'white' : 'black' 
            }}
          >
            C
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('%')}
            sx={{ 
              bgcolor: isDark ? 'grey.700' : 'grey.300', 
              color: isDark ? 'white' : 'black' 
            }}
          >
            %
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={handleCalculate}
            sx={{ 
              bgcolor: isDark ? 'grey.700' : 'grey.300', 
              color: isDark ? 'white' : 'black' 
            }}
          >
            =
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Calculator;