import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Grid, Typography, Paper, useTheme, IconButton } from '@mui/material';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('');
  const [result, setResult] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';


  const handleButtonClick = (value: string) => {
    if (isCalculated) {
      // If we already calculated something and user presses a new button, start fresh
      setDisplay(value);
      setResult('');
      setIsCalculated(false);
      return;
    }
    
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

  // Memoize handleCalculate to avoid dependency issues in useEffect
  const handleCalculate = useCallback(() => {
    if (!display.trim()) {
      setResult('');
      return;
    }
    
    if (isCalculated) {
      // If already calculated, start a new calculation with the result
      setDisplay(result);
      setIsCalculated(false);
      return;
    }
    
    try {
      // eslint-disable-next-line no-eval
      const evalResult = eval(display.replace(/[+\-*/]$/, ''));
      
      if (evalResult === undefined || isNaN(evalResult)) {
        setResult('Error');
      } else {
        setResult(evalResult.toString());
        setIsCalculated(true);
      }
    } catch (error) {
      console.error('Calculation error:', error);
      setResult('Error');
    }
  }, [display, result, isCalculated]);

  const autoCalculate = (expression: string) => {
    if (!expression.trim()) {
      setResult('');
      return;
    }
    
    try {
      // eslint-disable-next-line no-eval
      const evalResult = eval(expression.replace(/[+\-*/]$/, ''));
      
      if (evalResult === undefined || isNaN(evalResult)) {
        setResult('');
      } else {
        setResult(evalResult.toString());
      }
    } catch {
      setResult('');
    }
  };

  // Effect to handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;
      
      // Enter key handling removed to disable this functionality
      
      if (key === 'Escape' || key.toLowerCase() === 'c') {
        // Inline handleClear logic
        setDisplay('');
        setResult('');
        setIsCalculated(false);
      } else if (key === 'Backspace') {
        // Inline handleBackspace logic
        if (isCalculated) return;
        setDisplay(prev => {
          const newDisplay = prev.slice(0, -1);
          try {
            if (!newDisplay.trim()) {
              setResult('');
              return newDisplay;
            }
            
            // eslint-disable-next-line no-eval
            const evalResult = eval(newDisplay.replace(/[+\-*/]$/, ''));
            if (evalResult !== undefined && !isNaN(evalResult)) {
              setResult(evalResult.toString());
            } else {
              setResult('');
            }
          } catch {
            setResult('');
          }
          return newDisplay;
        });
      } else if (/[0-9+\-*/.%]/.test(key)) {
        if (isCalculated) {
          // If previous calculation is done and user starts typing,
          // clear display and start new calculation
          setDisplay(key);
          setIsCalculated(false);
        } else {
          setDisplay(prev => {
            const newDisplay = prev + key;
            try {
              if (!newDisplay.trim()) {
                setResult('');
                return newDisplay;
              }
              
              // eslint-disable-next-line no-eval
              const evalResult = eval(newDisplay.replace(/[+\-*/]$/, ''));
              if (evalResult !== undefined && !isNaN(evalResult)) {
                setResult(evalResult.toString());
              } else {
                setResult('');
              }
            } catch {
              setResult('');
            }
            return newDisplay;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleCalculate]);

  // Button styling based on button type
  const getButtonStyle = (type: 'number' | 'operator' | 'action' | 'equals') => {
    switch (type) {
      case 'number':
        return {
          bgcolor: isDark ? 'grey.800' : 'grey.50',
          color: isDark ? 'white' : 'text.primary',
          '&:hover': {
            bgcolor: isDark ? 'grey.700' : 'grey.200',
          },
          boxShadow: 1,
        };
      case 'operator':
        return {
          bgcolor: isDark ? theme.palette.primary.dark : theme.palette.primary.light,
          color: isDark ? 'white' : theme.palette.primary.contrastText,
          '&:hover': {
            bgcolor: theme.palette.primary.main,
          },
          boxShadow: 1,
        };
      case 'action':
        return {
          bgcolor: isDark ? theme.palette.error.dark : theme.palette.error.light,
          color: isDark ? 'white' : theme.palette.error.contrastText,
          '&:hover': {
            bgcolor: theme.palette.error.main,
          },
          boxShadow: 1,
        };
      case 'equals':
        return {
          bgcolor: isDark ? theme.palette.success.dark : theme.palette.success.main,
          color: 'white',
          '&:hover': {
            bgcolor: theme.palette.success.dark,
          },
          boxShadow: 2,
        };
      default:
        return {};
    }
  };

  return (
    <Paper 
      elevation={4}
      sx={{ 
        p: 2.5, 
        bgcolor: isDark ? 'grey.900' : 'background.paper', 
        borderRadius: 3,
        maxWidth: '350px', 
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.1)',
      }}
    >

      {/* Display Area */}
      <Paper
        elevation={1}
        sx={{
          mb: 1.5,
          p: 1.5,
          bgcolor: isDark ? 'grey.800' : 'grey.100',
          borderRadius: 2,
          minHeight: '45px', 
          overflowY: 'auto',
          textAlign: 'right', 
          display: 'flex',
          alignItems: 'right',
          justifyContent: 'flex-end',
          flexDirection: 'column',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Typography
          variant="h6" 
          sx={{
            wordWrap: 'break-word', 
            whiteSpace: 'pre-wrap', 
            fontSize: display.length > 10 ? '1rem' : '1.5rem', 
            lineHeight: '1.2',
            color: isDark ? 'grey.300' : 'text.primary',
            fontFamily: 'monospace',
          }}
        >
          {display}
        </Typography>
      </Paper>
      <Paper
        elevation={1}
        sx={{
          mb: 2.5,
          p: 1.5,
          bgcolor: isDark ? 'grey.800' : 'grey.100',
          borderRadius: 2,
          minHeight: '50px', 
          overflowY: 'auto',
          textAlign: 'right', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Typography
          variant="h4" 
          sx={{
            wordWrap: 'break-word', 
            whiteSpace: 'pre-wrap', 
            fontSize: result.length > 10 ? '1.2rem' : '1.8rem', 
            lineHeight: '1.2',
            fontWeight: 'bold',
            color: isDark ? theme.palette.primary.light : theme.palette.primary.dark,
            fontFamily: 'monospace',
          }}
        >
          {result}
        </Typography>
      </Paper>

      {/* Buttons */}
      <Grid container spacing={1.2}>
        {/* First row */}
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={handleClear}
            sx={getButtonStyle('action')}
          >
            C
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={handleBackspace}
            sx={getButtonStyle('action')}
          >
            ⌫
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('%')}
            sx={getButtonStyle('operator')}
          >
            %
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('/')}
            sx={getButtonStyle('operator')}
          >
            ÷
          </Button>
        </Grid>

        {/* Second row */}
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('7')}
            sx={getButtonStyle('number')}
          >
            7
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('8')}
            sx={getButtonStyle('number')}
          >
            8
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('9')}
            sx={getButtonStyle('number')}
          >
            9
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('*')}
            sx={getButtonStyle('operator')}
          >
            ×
          </Button>
        </Grid>

        {/* Third row */}
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('4')}
            sx={getButtonStyle('number')}
          >
            4
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('5')}
            sx={getButtonStyle('number')}
          >
            5
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('6')}
            sx={getButtonStyle('number')}
          >
            6
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('-')}
            sx={getButtonStyle('operator')}
          >
            −
          </Button>
        </Grid>

        {/* Fourth row */}
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('1')}
            sx={getButtonStyle('number')}
          >
            1
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('2')}
            sx={getButtonStyle('number')}
          >
            2
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('3')}
            sx={getButtonStyle('number')}
          >
            3
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('+')}
            sx={getButtonStyle('operator')}
          >
            +
          </Button>
        </Grid>

        {/* Fifth row */}
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('00')}
            sx={getButtonStyle('number')}
          >
            00
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('0')}
            sx={getButtonStyle('number')}
          >
            0
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleButtonClick('.')}
            sx={getButtonStyle('number')}
          >
            .
          </Button>
        </Grid>
        <Grid item xs={3}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={handleCalculate}
            sx={getButtonStyle('equals')}
          >
            =
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default Calculator;