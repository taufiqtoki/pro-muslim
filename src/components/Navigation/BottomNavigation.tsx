import React from 'react';
import { Paper, BottomNavigation as MuiBottomNavigation, BottomNavigationAction, Badge } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WorkIcon from '@mui/icons-material/Work';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import HomeIcon from '@mui/icons-material/Home';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import Calculator from '../Calculator.tsx'; // Adjust the path to point to the correct location

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const paths = ['/', '/agenda', '/routine', '/works', '/bucket', '/player'];
  const currentTab = Math.max(paths.indexOf(location.pathname), 0);

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1000,
        width: '100%',
        maxWidth: '100vw',
        borderRadius: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: '0px -1px 4px rgba(0,0,0,0.05)',
        bgcolor: 'background.paper',
        height: 50,
        '& .MuiBottomNavigationAction-root': {
          maxWidth: 'none',
          minWidth: 'auto',
          padding: '4px 0',
          color: 'text.secondary',
          '&.Mui-selected': {
            color: 'primary.main',
            fontWeight: 600
          }
        },
        '& .MuiBottomNavigationAction-label': {
          fontSize: '0.8rem',
          marginTop: '1px',
          transition: 'all 0.2s ease',
          '&.Mui-selected': {
            fontSize: '0.8rem'
          }
        }
      }} 
    >
      <MuiBottomNavigation
        value={currentTab}
        onChange={(_, newValue) => {
          navigate(paths[newValue]);
        }}
        showLabels
        sx={{ 
          height: '100%',
          bgcolor: 'transparent',
          '& .MuiSvgIcon-root': {
            fontSize: '1.5rem',
            transition: 'transform 0.2s ease',
          },
          '& .Mui-selected .MuiSvgIcon-root': {
            transform: 'scale(1.1)',
            filter: 'drop-shadow(0 0 2px rgba(var(--primary-rgb), 0.3))'
          }
        }}
      >
        <BottomNavigationAction 
          label="Home" 
          icon={<HomeIcon />} 
        />
        <BottomNavigationAction 
          label="Agenda" 
          icon={<CalendarMonthIcon />} 
        />
        <BottomNavigationAction 
          label="Routine" 
          icon={<AccessTimeIcon />} 
        />
        <BottomNavigationAction 
          label="Works" 
          icon={<WorkIcon />} 
        />
        <BottomNavigationAction 
          label="Bucket" 
          icon={<FormatListBulletedIcon />} 
        />
        <BottomNavigationAction 
          label="Player" 
          icon={<MusicNoteIcon />} 
        />
      </MuiBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;
