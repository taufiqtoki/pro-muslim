import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Box, 
  Stack, 
  Tooltip, 
  Button, 
  Menu, 
  MenuItem, 
  useTheme as useMuiTheme, 
  useMediaQuery,
  Avatar,
  Container
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import MosqueIcon from '@mui/icons-material/Mosque';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
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
    <Box className="app">
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
        position="sticky" 
        elevation={0}
        className="glass-effect"
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          height: '64px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: '64px' }}>
            <Stack 
              direction="row" 
              alignItems="center" 
              spacing={1} 
              sx={{ flexGrow: 1 }}
            >
              <MosqueIcon sx={{ color: 'primary.main' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'text.primary',
                  fontWeight: 600,
                  letterSpacing: '-0.5px'
                }}
              >
                Pro Muslim
              </Typography>
            </Stack>

            {user ? (
              <>
                <Button
                  onClick={handleMenuOpen}
                  startIcon={
                    user.photoURL ? (
                      <Avatar 
                        src={user.photoURL} 
                        alt={user.displayName || 'User'} 
                        sx={{ width: 32, height: 32 }}
                      />
                    ) : (
                      <AccountCircleIcon />
                    )
                  }
                  sx={{ 
                    color: 'text.primary',
                    textTransform: 'none',
                    borderRadius: 'var(--radius-pill)',
                    transition: 'var(--transition-normal)',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  {user.displayName}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    className: 'paper',
                    elevation: 2,
                    sx: { 
                      mt: 1.5, 
                      minWidth: 180,
                      borderRadius: 'var(--radius-md)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                    }
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem 
                    onClick={() => { navigate('/profile'); handleMenuClose(); }}
                    sx={{
                      borderRadius: 'var(--radius-sm)',
                      m: 0.5,
                      py: 1
                    }}
                  >
                    Profile
                  </MenuItem>
                  <MenuItem 
                    onClick={handleSignOut}
                    sx={{
                      borderRadius: 'var(--radius-sm)',
                      m: 0.5,
                      py: 1
                    }}
                  >
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsAuthModalOpen(true)}
                  variant="contained"
                  sx={{ 
                    color: 'white',
                    mr: 1,
                    borderRadius: 'var(--radius-pill)',
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 'var(--shadow-sm)'
                    }
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
                  mr: 1,
                  borderRadius: 'var(--radius-md)',
                  width: 40,
                  height: 40,
                  transition: 'var(--transition-normal)'
                }}
              >
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton 
                onClick={() => navigate('/settings')}
                sx={{ 
                  color: 'text.primary',
                  borderRadius: 'var(--radius-md)',
                  width: 40,
                  height: 40,
                  transition: 'var(--transition-normal)'
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>
      
      <Box className="app-wrapper">
        <Container 
          maxWidth="lg"
          component="main" 
          className="content custom-scrollbar fade-in"
          sx={{ 
            pb: 10,
            pt: 2
          }}
        >
          <Outlet />
        </Container>
      </Box>

      <BottomNavigation />
      <AuthModal 
        open={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </Box>
  );
};
