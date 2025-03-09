import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, IconButton, Typography, Box, Stack, Tooltip, Button, Menu, MenuItem, useTheme as useMuiTheme, useMediaQuery } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import MosqueIcon from '@mui/icons-material/Mosque';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import BottomNavigation from "../../components/Navigation/BottomNavigation.tsx";
import AuthModal from '../../components/AuthModal.tsx';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isPC = useMediaQuery(theme.breakpoints.up('md'));
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await signOut();
    handleMenuClose();
  };

  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        gap: { xs: 1, sm: 2 },
        p: { xs: 1, sm: 2 },
      }}
    >
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <Stack 
            direction="row" 
            alignItems="center" 
            spacing={1} 
            sx={{ flexGrow: 1 }}
          >
            <MosqueIcon sx={{ color: 'text.primary' }} />
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.primary',
                fontWeight: 500,
                letterSpacing: 0.5
              }}
            >
              Pro Muslim
            </Typography>
          </Stack>

          {user ? (
            <>
              <Button
                onClick={handleMenuOpen}
                sx={{ 
                  color: 'text.primary',
                  textTransform: 'none'
                }}
              >
                {user.displayName}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>Profile</MenuItem>
                <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  setIsAuthModalOpen(true);
                }}
                sx={{ 
                  color: 'text.primary',
                  mr: 1
                }}
              >
                Sign In
              </Button>
            </>
          )}

          <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
            <IconButton 
              onClick={toggleTheme}
              sx={{ 
                color: 'text.primary',
                mr: 1
              }}
            >
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton 
              onClick={() => navigate('/settings')}
              sx={{ 
                color: 'text.primary'
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ flex: 1, pb: 7, overflow: 'auto' }}>
        <Outlet />
      </Box>

      <BottomNavigation />

      <AuthModal 
        open={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </Box>
  );
};
