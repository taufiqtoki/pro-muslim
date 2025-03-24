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
import YouTube from 'react-youtube';
import { usePlayer } from '../../contexts/PlayerContext.tsx';

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
  const { youtubeRef, audioRef, currentTrack, isPlaying, handleNextTrack } = usePlayer();

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

  // Add event handlers for YouTube player
  const handleYoutubeStateChange = (event: any) => {
    if (event.data === YouTube.PlayerState.ENDED) {
      handleNextTrack();
    }
  };

  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* Hidden audio players */}
      <Box sx={{ display: 'none' }}>
        {/* YouTube player */}
        {currentTrack?.type === 'youtube' && (
          <YouTube
            videoId={currentTrack.videoId}
            ref={youtubeRef}
            opts={{
              height: '1',
              width: '1',
              playerVars: {
                autoplay: isPlaying ? 1 : 0,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                enablejsapi: 1,
                playsinline: 1
              },
            }}
            onStateChange={handleYoutubeStateChange}
          />
        )}
        {/* Audio element */}
        <audio
          ref={audioRef}
          onEnded={handleNextTrack}
        />
      </Box>

      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          height: '8vh', // Add this line to make height 8% of viewport height
          minHeight: '48px', // Add minimum height for very small screens
          '& .MuiToolbar-root': { // Add this to adjust toolbar height
            minHeight: '100% !important',
            height: '100%',
            padding: '0 16px'
          }
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
      
      <Box sx={{ 
        flex: 1, 
        pb: 7, 
        overflow: 'auto',
        height: '92vh',
      }}>
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
