import React from 'react';
import { Paper, BottomNavigation as MuiBottomNavigation, BottomNavigationAction } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WorkIcon from '@mui/icons-material/Work';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import HomeIcon from '@mui/icons-material/Home';
import Calculator from '../Calculator.tsx'; // Adjust the path to point to the correct location

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const paths = ['/', '/agenda', '/routine', '/works', '/bucket'];
  const currentTab = Math.max(paths.indexOf(location.pathname), 0);

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        boxShadow: 3,
        zIndex: 1000,
        width: '100%', // Ensure it takes the full width of the viewport
        maxWidth: '100vw' // Prevent overflow
      }} 
      elevation={3}
    >
      <MuiBottomNavigation
        value={currentTab}
        onChange={(_, newValue) => {
          navigate(paths[newValue]);
        }}
        showLabels
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
      </MuiBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;
