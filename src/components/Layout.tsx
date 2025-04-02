import React, { ReactNode } from 'react';
import { 
  AppBar, 
  Box, 
  Container, 
  IconButton, 
  Toolbar, 
  Typography, 
  Button, 
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  useMediaQuery,
  Divider,
  Avatar
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import BookIcon from '@mui/icons-material/Book';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useAuth } from '../hooks/useAuth.ts';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const isMobile = useMediaQuery('(max-width:900px)');
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { title: 'Home', path: '/', icon: <HomeIcon /> },
    { title: 'Works', path: '/works', icon: <ListAltIcon /> },
    { title: 'Agenda', path: '/agenda', icon: <BookIcon /> },
    { title: 'Routine', path: '/routine', icon: <ListAltIcon /> },
    { title: 'Bucket List', path: '/bucket', icon: <ListAltIcon /> },
    { title: 'Profile', path: '/profile', icon: <AccountCircleIcon /> },
    { title: 'Report', path: '/report', icon: <AssessmentIcon /> },
    { title: 'Audio Player', path: '/player', icon: <MusicNoteIcon /> },
    { title: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  ];

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const getCurrentYear = () => new Date().getFullYear();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed" color="transparent" elevation={0}>
        <Toolbar>
          {isMobile ? (
            <>
              <IconButton
                edge="start"
                color="primary"
                aria-label="menu"
                onClick={toggleDrawer}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                Pro Muslim
              </Typography>
            </>
          ) : (
            <>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  flexGrow: 0,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  mr: 4,
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/')}
              >
                Pro Muslim
              </Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
                {navItems.slice(0, 5).map((item) => (
                  <Button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    color="primary"
                    sx={{
                      fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                      borderBottom: location.pathname === item.path ? 2 : 0,
                      borderRadius: 0,
                      py: 2
                    }}
                  >
                    {item.title}
                  </Button>
                ))}
              </Box>
            </>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={toggleTheme} color="primary">
              {isDark ? <WbSunnyIcon /> : <DarkModeIcon />}
            </IconButton>
            
            {user ? (
              <Avatar 
                src={user.photoURL || undefined}
                alt={user.displayName || 'User'}
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: 'primary.main',
                  color: isDark ? 'black' : 'white',
                  ml: 1
                }}
                onClick={() => navigate('/profile')}
              >
                {!user.photoURL && (user.displayName?.[0] || 'U')}
              </Avatar>
            ) : (
              <Button 
                variant="outlined" 
                onClick={() => navigate('/profile')}
                sx={{ ml: 1 }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: isDark ? '#121212' : '#f5f5f5',
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Menu
          </Typography>
          <IconButton onClick={toggleDrawer}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => {
                navigate(item.path);
                toggleDrawer();
              }}
              selected={location.pathname === item.path}
              sx={{
                bgcolor: location.pathname === item.path
                  ? (isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                  : 'transparent',
                borderRight: location.pathname === item.path
                  ? `4px solid ${isDark ? '#d4af37' : '#000'}`
                  : 'none',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                }
              }}
            >
              <ListItemIcon sx={{ color: 'primary.main' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.title} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: 8, sm: 10 },
          pb: 4,
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              minHeight: '70vh',
              bgcolor: isDark ? 'rgba(18, 18, 18, 0.6)' : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            }}
          >
            {children}
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          borderTop: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {getCurrentYear()} Pro Muslim. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout; 