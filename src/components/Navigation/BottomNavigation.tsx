import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Paper, BottomNavigation as MuiBottomNavigation, BottomNavigationAction, Fab, useTheme as useMuiTheme, useMediaQuery } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useTheme } from '../../contexts/ThemeContext';
import AlarmClock from '../AlarmClock';

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const isTablet = useMediaQuery(muiTheme.breakpoints.up('sm'));
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);

  // Extract the current route value
  const getCurrentValue = () => {
    const path = location.pathname.split('/')[1] || '/';
    
    if (path === '/') return 0;
    if (path === 'works') return 1;
    if (path === 'agenda') return 2;
    if (path === 'routine') return 3;
    if (path === 'bucket') return 4;
    if (path === 'player') return 5;
    
    return 0; // Default to home
  };

  // Handle navigation
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/works');
        break;
      case 2:
        navigate('/agenda');
        break;
      case 3:
        navigate('/routine');
        break;
      case 4:
        navigate('/bucket');
        break;
      case 5:
        navigate('/player');
        break;
      default:
        navigate('/');
    }
  };

  // Close alarm modal
  const handleCloseAlarmModal = () => {
    setAlarmModalOpen(false);
  };

  return (
    <>
      {/* Fixed Position Bottom Navigation */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderRadius: '0px',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          py: 0.5,
          bgcolor: isDark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
          transition: 'background-color 0.3s ease',
        }}
        elevation={0}
      >
        <MuiBottomNavigation
          showLabels={true}
          value={getCurrentValue()}
          onChange={handleChange}
          sx={{ 
            bgcolor: 'transparent',
            px: 0.75,
            '& .MuiBottomNavigationAction-root': {
              color: 'text.disabled',
              '&.Mui-selected': { 
                color: 'primary.main' 
              }
            }
          }}
        >
          <BottomNavigationAction 
            label="Home" 
            icon={<HomeIcon />} 
            sx={{ minWidth: 0 }}
          />
          <BottomNavigationAction 
            label="Works" 
            icon={<WorkIcon />} 
            sx={{ minWidth: 0 }}
          />
          <BottomNavigationAction 
            label="Agenda" 
            icon={<FormatListBulletedIcon />} 
            sx={{ minWidth: 0 }}
          />
          <BottomNavigationAction 
            label="Routine" 
            icon={<EventNoteIcon />} 
            sx={{ minWidth: 0 }}
          />
          <BottomNavigationAction 
            label="Bucket" 
            icon={<ListAltIcon />} 
            sx={{ minWidth: 0 }}
          />
          <BottomNavigationAction 
            label="Player" 
            icon={<MusicNoteIcon />} 
            sx={{ minWidth: 0 }}
          />
        </MuiBottomNavigation>
        
      </Paper>
      
      {/* Alarm Modal */}
      {alarmModalOpen && (
        <AlarmClock isModal={true} onClose={handleCloseAlarmModal} />
      )}
    </>
  );
}