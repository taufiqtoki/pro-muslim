import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Skeleton,
  useMediaQuery,
  useTheme as useMuiTheme,
  IconButton,
  Fade,
  Stack,
  Tooltip
} from '@mui/material';
import Stopwatch from '../../components/Stopwatch';
import PrayerTimesWidget from '../../components/prayer/PrayerTimesWidget';
import ClockWidget from '../../components/ClockWidget';
import SleepTracker from '../../components/tracking/SleepTracker';
import TasbeehTracker from '../../components/TasbeehTracker';
import { useTheme } from '../../contexts/ThemeContext';
import { Tasbeeh } from '../../hooks/useTasbeehs';
import RefreshIcon from '@mui/icons-material/Refresh';

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
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

// Widget config - Fixed Pixel Heights for both layouts
const WIDGETS = {
  CLOCK: {
    id: 'clock',
    title: 'Clock',
    component: ClockWidget,
    singleColumnHeight: '100px', // Height for < 890px layout
    doubleColumnHeight: '140px' // Height for >= 890px layout
  },
  PRAYER: {
    id: 'prayer',
    title: 'Prayer Times',
    component: PrayerTimesWidget,
    singleColumnHeight: '325px',
    doubleColumnHeight: '291px' 
  },
  STOPWATCH: {
    id: 'stopwatch',
    title: 'Stopwatch',
    component: Stopwatch,
    singleColumnHeight: '120px',
    doubleColumnHeight: '140px' 
  },
  TASBEEH: {
    id: 'tasbeeh',
    title: 'Tasbeeh',
    component: TasbeehTracker,
    singleColumnHeight: '150px',
    doubleColumnHeight: '140px' 
  },
  SLEEP: {
    id: 'sleep',
    title: 'Sleep Tracker',
    component: SleepTracker,
    singleColumnHeight: '150px',
    doubleColumnHeight: '140px' 
  }
};

const HomeTab: React.FC = () => {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();
  
  // Use MUI useMediaQuery to check the 890px breakpoint
  const isWideScreen = useMediaQuery('(min-width:890px)'); 
  
  const [loading, setLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState(Date.now());

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

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setRefreshTime(Date.now());
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  // Reusable Card component
  const SimpleCard = ({ 
    children,
    height,
    title,
    widgetId
  }: { 
    children: React.ReactNode,
    height?: string | number,
    title?: string,
    widgetId?: string
  }) => {
    return (
    <Card
      elevation={0}
      sx={{
        height: height || 'auto',
        background: isDark ? 'rgba(18, 18, 18, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, height 0.3s ease',
        position: 'relative',
        backdropFilter: 'blur(8px)',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: isDark ? '0 10px 20px rgba(0,0,0,0.4)' : '0 10px 20px rgba(0,0,0,0.1)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1, sm: 1.5 }, height: '100%', overflow: 'hidden' }}>
        {loading ? (
          <>
            <Skeleton variant="rectangular" height={80} sx={{ mb: 1.5 }} />
            <Skeleton variant="text" width="85%" />
            <Skeleton variant="text" width="55%" />
          </>
        ) : (
          <Fade in={!loading} timeout={500}>
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column'
            }}> 
              {children}
            </Box>
          </Fade>
        )}
      </CardContent>
    </Card>
  );
  };

  const spacing = 1.5; // Consistent spacing

  return (
    <Box sx={{ 
      animation: 'fadeIn 0.5s ease-in-out',
      position: 'relative',
      height: 'auto', 
      pt: 0 
    }}>
      {/* Refresh button */} 
      {/* REMOVED Tooltip and IconButton for Refresh */}
      
      {/* Conditional Rendering based on screen width */}
      {isWideScreen ? (
        // Double Column Layout (>= 890px)
        <Grid container spacing={spacing}> 
          {/* Column 1 */}
          <Grid item xs={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: spacing }}>
              <SimpleCard height={WIDGETS.CLOCK.doubleColumnHeight} title={WIDGETS.CLOCK.title} widgetId={WIDGETS.CLOCK.id}>
                <ClockWidget />
              </SimpleCard>
            </Box>
            <Box sx={{ mb: spacing }}>
              <SimpleCard height={WIDGETS.STOPWATCH.doubleColumnHeight} title={WIDGETS.STOPWATCH.title} widgetId={WIDGETS.STOPWATCH.id}>
                <Stopwatch />
              </SimpleCard>
            </Box>
            <Box>
              <SimpleCard height={WIDGETS.SLEEP.doubleColumnHeight} title={WIDGETS.SLEEP.title} widgetId={WIDGETS.SLEEP.id}>
                <SleepTracker />
              </SimpleCard>
            </Box>
          </Grid>
          
          {/* Column 2 */} 
          <Grid item xs={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: spacing }}>
              <SimpleCard height={WIDGETS.PRAYER.doubleColumnHeight} title={WIDGETS.PRAYER.title} widgetId={WIDGETS.PRAYER.id}>
                <PrayerTimesWidget />
              </SimpleCard>
            </Box>
            <Box>
              <SimpleCard height={WIDGETS.TASBEEH.doubleColumnHeight} title={WIDGETS.TASBEEH.title} widgetId={WIDGETS.TASBEEH.id}>
                <TasbeehTracker initialTasbeehs={initialTasbeehs} />
              </SimpleCard>
            </Box>
          </Grid>
        </Grid>
      ) : (
        // Single Column Layout (< 890px)
        <Grid container spacing={spacing}>
          <Grid item xs={12}>
            <SimpleCard height={WIDGETS.CLOCK.singleColumnHeight} title={WIDGETS.CLOCK.title} widgetId={WIDGETS.CLOCK.id}>
              <ClockWidget />
            </SimpleCard>
          </Grid>
          <Grid item xs={12}>
            <SimpleCard height={WIDGETS.PRAYER.singleColumnHeight} title={WIDGETS.PRAYER.title} widgetId={WIDGETS.PRAYER.id}>
              <PrayerTimesWidget />
            </SimpleCard>
          </Grid>
          <Grid item xs={12}>
            <SimpleCard height={WIDGETS.STOPWATCH.singleColumnHeight} title={WIDGETS.STOPWATCH.title} widgetId={WIDGETS.STOPWATCH.id}>
              <Stopwatch />
            </SimpleCard>
          </Grid>
          <Grid item xs={12}>
            <SimpleCard height={WIDGETS.TASBEEH.singleColumnHeight} title={WIDGETS.TASBEEH.title} widgetId={WIDGETS.TASBEEH.id}>
              <TasbeehTracker initialTasbeehs={initialTasbeehs} />
            </SimpleCard>
          </Grid>
          <Grid item xs={12}>
            <SimpleCard height={WIDGETS.SLEEP.singleColumnHeight} title={WIDGETS.SLEEP.title} widgetId={WIDGETS.SLEEP.id}>
              <SleepTracker />
            </SimpleCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default HomeTab;
