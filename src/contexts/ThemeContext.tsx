import React, { createContext, useContext, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, PaletteMode } from '@mui/material';

// RGB values for primary colors
const WHITE_RGB = '255, 255, 255'; // Pure white
const BLACK_RGB = '0, 0, 0'; // Pure black

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => { console.log('Theme toggled'); }
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
      mode,
      ...(mode === 'dark'
        ? {
            // Dark theme (Black-White)
            primary: {
              main: '#ffffff', // Pure white
              light: '#e0e0e0',
              dark: '#cccccc',
            },
            secondary: {
              main: '#ffffff', // Also white for secondary
            },
            background: {
              default: '#000000', // Pure black
              paper: '#000000', // Pure black
            },
            text: {
              primary: '#ffffff', // White
              secondary: 'rgba(255, 255, 255, 0.7)', // White but slightly faded
              disabled: 'rgba(255, 255, 255, 0.5)', // Faded white
            },
            divider: 'rgba(255, 255, 255, 0.2)',
          }
        : {
            // Light theme (White-Black)
            primary: {
              main: '#000000', // Pure black
              light: '#333333',
              dark: '#000000',
            },
            secondary: {
              main: '#000000', // Also black for secondary
            },
            background: {
              default: '#ffffff', // Pure white
              paper: '#ffffff', // Pure white
            },
            text: {
              primary: '#000000', // Black
              secondary: 'rgba(0, 0, 0, 0.7)', // Slightly faded black
              disabled: 'rgba(0, 0, 0, 0.5)', // Faded black
            },
            divider: 'rgba(0, 0, 0, 0.2)',
          }),
    },
    typography: {
      fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      allVariants: {
        color: mode === 'dark' ? '#ffffff' : '#000000', // Text color based on theme
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === 'dark' ? '#000000' : '#ffffff',
            scrollbarColor: mode === 'dark' 
              ? `rgba(${WHITE_RGB}, 0.5) rgba(${WHITE_RGB}, 0.1)` 
              : `rgba(${BLACK_RGB}, 0.5) rgba(${BLACK_RGB}, 0.1)`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          containedPrimary: {
            color: mode === 'dark' ? '#000000' : '#ffffff', // Text color contrast
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#e0e0e0' : '#333333',
            },
          },
          outlinedPrimary: {
            borderColor: mode === 'dark' ? '#ffffff' : '#000000',
            '&:hover': {
              borderColor: mode === 'dark' ? '#e0e0e0' : '#333333',
              backgroundColor: mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.08)',
            },
          },
          textPrimary: {
            '&:hover': {
              backgroundColor: mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.08)',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#000000' : '#ffffff',
            [`@media (max-width:${600}px)`]: {
              margin: 0,
              maxHeight: '100%',
              borderRadius: 0,
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#000000' : '#ffffff',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: mode === 'dark' ? '#ffffff' : '#000000',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              color: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: mode === 'dark' ? '#ffffff' : '#000000',
              },
            },
          },
        },
      },
    },
  });

  const theme = createTheme(getDesignTokens(isDark ? 'dark' : 'light'));

  const toggleTheme = () => {
    setIsDark(prev => {
      const newValue = !prev;
      localStorage.setItem('theme', newValue ? 'dark' : 'light');
      return newValue;
    });
  };

  // Set CSS variables for use in non-MUI components
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--primary-rgb', 
      isDark ? WHITE_RGB : BLACK_RGB
    );
    document.documentElement.style.setProperty(
      '--primary-color', 
      isDark ? '#ffffff' : '#000000'
    );
    document.documentElement.style.setProperty(
      '--background-color', 
      isDark ? '#000000' : '#ffffff'
    );
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
