import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Skeleton,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MosqueIcon from '@mui/icons-material/Mosque';
import TimerIcon from '@mui/icons-material/Timer';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import Stopwatch from '../../components/Stopwatch';
import PrayerTimesWidget from '../../components/prayer/PrayerTimesWidget';
import ClockWidget from '../../components/ClockWidget';
import SleepTracker from '../../components/tracking/SleepTracker';
import TasbeehTracker from '../../components/TasbeehTracker';
import { useTheme } from '../../contexts/ThemeContext';
import { Tasbeeh } from '../../hooks/useTasbeehs';

// CSS animation style
const fadeInAnimation = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const HomeTab: React.FC = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const isPC = useMediaQuery(muiTheme.breakpoints.up('md'));
  const [loading, setLoading] = useState(true);

  // Add CSS style with useEffect
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = fadeInAnimation;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Simulate loading for smoother transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Add initial tasbeehs array
  const initialTasbeehs: Tasbeeh[] = [
    // Add your initial tasbeehs here if needed, or leave as empty array
  ];

  const SimpleCard = ({ 
    children,
    height
  }: { 
    children: React.ReactNode,
    height?: string | number
  }) => (
    <Card
      elevation={0}
      sx={{
        height: height || '100%',
        background: isDark ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        borderRadius: 3,
        border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: isDark ? '0 10px 20px rgba(0,0,0,0.4)' : '0 10px 20px rgba(0,0,0,0.1)',
        }
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        {loading ? (
          <>
            <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="60%" />
          </>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );

  // Mobile layout
  const MobileLayout = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <SimpleCard height="160px">
          <ClockWidget />
        </SimpleCard>
      </Grid>
      
      <Grid item xs={12}>
        <SimpleCard>
          <PrayerTimesWidget />
        </SimpleCard>
      </Grid>
      
      <Grid item xs={12}>
        <SimpleCard height="200px">
          <Stopwatch />
        </SimpleCard>
      </Grid>
      
      <Grid item xs={12}>
        <SimpleCard height="200px">
          <TasbeehTracker tasbeehs={initialTasbeehs} />
        </SimpleCard>
      </Grid>
      
      <Grid item xs={12}>
        <SimpleCard>
          <SleepTracker />
        </SimpleCard>
      </Grid>
    </Grid>
  );

  // PC layout
  const PCLayout = () => (
    <Grid container spacing={3}>
      {/* Left Column: Clock, Stopwatch, Sleep Tracker */}
      <Grid item md={6}>
        <Grid container spacing={3}>
          <Grid item md={12}>
            <SimpleCard height="180px">
              <ClockWidget />
            </SimpleCard>
          </Grid>
          
          <Grid item md={12}>
            <SimpleCard height="180px">
              <Stopwatch />
            </SimpleCard>
          </Grid>
          
          <Grid item md={12}>
            <SimpleCard height="180px">
              <SleepTracker />
            </SimpleCard>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Right Column: Prayer Times Widget, Tasbeeh Tracker */}
      <Grid item md={6}>
        <Grid container spacing={3}>
          <Grid item md={12} sx={{ height: '60%', minHeight: '400px' }}>
            <SimpleCard height="100%">
              <PrayerTimesWidget />
            </SimpleCard>
          </Grid>
          
          <Grid item md={12} sx={{ height: '40%' }}>
            <SimpleCard height="100%">
              <TasbeehTracker tasbeehs={initialTasbeehs} />
            </SimpleCard>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      {/* Main Widgets */}
      {isPC ? <PCLayout /> : <MobileLayout />}
    </Box>
  );
};

export default HomeTab;
