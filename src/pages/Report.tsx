import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid, Tabs, Tab, CircularProgress, Divider } from '@mui/material';
import { useAuth } from '../hooks/useAuth.ts';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const Report: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [taskStats, setTaskStats] = useState<{
    completed: number;
    pending: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    }
  }>({
    completed: 0,
    pending: 0,
    byPriority: {
      high: 0,
      medium: 0,
      low: 0
    }
  });
  
  const [eventStats, setEventStats] = useState<{
    total: number;
    byCategory: {
      islamic: number;
      work: number;
      personal: number;
      education: number;
      general: number;
    }
  }>({
    total: 0,
    byCategory: {
      islamic: 0,
      work: 0,
      personal: 0,
      education: 0,
      general: 0
    }
  });
  
  const [prayerStats, setPrayerStats] = useState<{
    tracked: number;
    onTime: number;
    late: number;
    missed: number;
  }>({
    tracked: 0,
    onTime: 0,
    late: 0,
    missed: .0
  });
  
  const [recentActivity, setRecentActivity] = useState<{
    date: Date;
    action: string;
    type: string;
  }[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch tasks stats
        const tasksQuery = query(
          collection(db, `users/${user.uid}/tasks`)
        );
        
        const taskSnapshot = await getDocs(tasksQuery);
        let completedTasks = 0;
        let pendingTasks = 0;
        let highPriorityTasks = 0;
        let mediumPriorityTasks = 0;
        let lowPriorityTasks = 0;
        
        taskSnapshot.forEach(doc => {
          const task = doc.data();
          if (task.completed) {
            completedTasks++;
          } else {
            pendingTasks++;
          }
          
          switch (task.priority) {
            case 'high':
              highPriorityTasks++;
              break;
            case 'medium':
              mediumPriorityTasks++;
              break;
            case 'low':
              lowPriorityTasks++;
              break;
          }
        });
        
        setTaskStats({
          completed: completedTasks,
          pending: pendingTasks,
          byPriority: {
            high: highPriorityTasks,
            medium: mediumPriorityTasks,
            low: lowPriorityTasks
          }
        });
        
        // Fetch events stats
        const eventsQuery = query(
          collection(db, `users/${user.uid}/events`)
        );
        
        const eventSnapshot = await getDocs(eventsQuery);
        let islamicEvents = 0;
        let workEvents = 0;
        let personalEvents = 0;
        let educationEvents = 0;
        let generalEvents = 0;
        
        eventSnapshot.forEach(doc => {
          const event = doc.data();
          switch (event.category) {
            case 'islamic':
              islamicEvents++;
              break;
            case 'work':
              workEvents++;
              break;
            case 'personal':
              personalEvents++;
              break;
            case 'education':
              educationEvents++;
              break;
            case 'general':
              generalEvents++;
              break;
          }
        });
        
        setEventStats({
          total: eventSnapshot.size,
          byCategory: {
            islamic: islamicEvents,
            work: workEvents,
            personal: personalEvents,
            education: educationEvents,
            general: generalEvents
          }
        });
        
        // Try to fetch prayer stats if available
        try {
          const prayerQuery = query(
            collection(db, `users/${user.uid}/prayers`)
          );
          
          const prayerSnapshot = await getDocs(prayerQuery);
          let onTimePrayers = 0;
          let latePrayers = 0;
          let missedPrayers = 0;
          
          prayerSnapshot.forEach(doc => {
            const prayer = doc.data();
            if (prayer.status === 'on-time') {
              onTimePrayers++;
            } else if (prayer.status === 'late') {
              latePrayers++;
            } else if (prayer.status === 'missed') {
              missedPrayers++;
            }
          });
          
          setPrayerStats({
            tracked: prayerSnapshot.size,
            onTime: onTimePrayers,
            late: latePrayers,
            missed: missedPrayers
          });
        } catch (error) {
          console.log('Prayer tracking not available or error:', error);
        }
        
        // Fetch recent activity
        const activityData: {
          date: Date;
          action: string;
          type: string;
        }[] = [];
        
        // Add recent tasks
        const recentTasksQuery = query(
          collection(db, `users/${user.uid}/tasks`),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const recentTasksSnapshot = await getDocs(recentTasksQuery);
        recentTasksSnapshot.forEach(doc => {
          const task = doc.data();
          activityData.push({
            date: task.createdAt.toDate(),
            action: `Added task: ${task.title}`,
            type: 'task'
          });
        });
        
        // Add recent events
        const recentEventsQuery = query(
          collection(db, `users/${user.uid}/events`),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const recentEventsSnapshot = await getDocs(recentEventsQuery);
        recentEventsSnapshot.forEach(doc => {
          const event = doc.data();
          activityData.push({
            date: event.createdAt.toDate(),
            action: `Added event: ${event.title}`,
            type: 'event'
          });
        });
        
        // Sort all activities by date
        activityData.sort((a, b) => b.date.getTime() - a.date.getTime());
        setRecentActivity(activityData.slice(0, 10)); // Get top 10
        
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Prepare chart data
  const taskPriorityData = [
    { name: 'High', value: taskStats.byPriority.high, color: '#f44336' },
    { name: 'Medium', value: taskStats.byPriority.medium, color: '#ff9800' },
    { name: 'Low', value: taskStats.byPriority.low, color: '#4caf50' }
  ];
  
  const taskStatusData = [
    { name: 'Completed', value: taskStats.completed, color: '#4caf50' },
    { name: 'Pending', value: taskStats.pending, color: '#ff9800' }
  ];
  
  const eventCategoryData = [
    { name: 'Islamic', value: eventStats.byCategory.islamic, color: '#4caf50' },
    { name: 'Work', value: eventStats.byCategory.work, color: '#2196f3' },
    { name: 'Personal', value: eventStats.byCategory.personal, color: '#ff9800' },
    { name: 'Education', value: eventStats.byCategory.education, color: '#9c27b0' },
    { name: 'General', value: eventStats.byCategory.general, color: '#607d8b' }
  ];
  
  const prayerStatusData = [
    { name: 'On Time', value: prayerStats.onTime, color: '#4caf50' },
    { name: 'Late', value: prayerStats.late, color: '#ff9800' },
    { name: 'Missed', value: prayerStats.missed, color: '#f44336' }
  ];
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Activity Report
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="report tabs">
                <Tab label="Overview" {...a11yProps(0)} />
                <Tab label="Tasks" {...a11yProps(1)} />
                <Tab label="Events" {...a11yProps(2)} />
                <Tab label="Prayer" {...a11yProps(3)} />
              </Tabs>
            </Box>
            
            {/* Overview Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                    {recentActivity.length > 0 ? (
                      <Box>
                        {recentActivity.map((activity, index) => (
                          <Box key={index} sx={{ py: 1 }}>
                            <Typography variant="body1">
                              {activity.action}
                              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                {formatDate(activity.date)}
                              </Typography>
                            </Typography>
                            {index < recentActivity.length - 1 && <Divider sx={{ my: 1 }} />}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No recent activity found.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Task Summary</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h3">{taskStats.completed + taskStats.pending}</Typography>
                      <Typography variant="body1" color="text.secondary">Total Tasks</Typography>
                      
                      <Box sx={{ mt: 2, width: '100%' }}>
                        <Typography variant="body2">
                          Completed: {taskStats.completed} ({Math.round((taskStats.completed / (taskStats.completed + taskStats.pending || 1)) * 100)}%)
                        </Typography>
                        <Typography variant="body2">
                          Pending: {taskStats.pending} ({Math.round((taskStats.pending / (taskStats.completed + taskStats.pending || 1)) * 100)}%)
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Event Summary</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h3">{eventStats.total}</Typography>
                      <Typography variant="body1" color="text.secondary">Total Events</Typography>
                      
                      <Box sx={{ mt: 2, width: '100%' }}>
                        <Typography variant="body2">
                          Islamic: {eventStats.byCategory.islamic}
                        </Typography>
                        <Typography variant="body2">
                          Work: {eventStats.byCategory.work}
                        </Typography>
                        <Typography variant="body2">
                          Personal: {eventStats.byCategory.personal}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Prayer Summary</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h3">{prayerStats.tracked}</Typography>
                      <Typography variant="body1" color="text.secondary">Prayers Tracked</Typography>
                      
                      <Box sx={{ mt: 2, width: '100%' }}>
                        <Typography variant="body2">
                          On Time: {prayerStats.onTime} ({Math.round((prayerStats.onTime / (prayerStats.tracked || 1)) * 100)}%)
                        </Typography>
                        <Typography variant="body2">
                          Late: {prayerStats.late} ({Math.round((prayerStats.late / (prayerStats.tracked || 1)) * 100)}%)
                        </Typography>
                        <Typography variant="body2">
                          Missed: {prayerStats.missed} ({Math.round((prayerStats.missed / (prayerStats.tracked || 1)) * 100)}%)
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Tasks Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Task Status</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {taskStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Task Priority</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={taskPriorityData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Tasks" fill="#8884d8">
                            {taskPriorityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Events Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Events by Category</Typography>
                    <Box sx={{ height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={eventCategoryData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Events" fill="#8884d8">
                            {eventCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Prayer Tab */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Prayer Status</Typography>
                    {prayerStats.tracked > 0 ? (
                      <Box sx={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={prayerStatusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {prayerStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body1" color="text.secondary">
                          No prayer tracking data available. Start tracking your prayers to see statistics.
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
          </>
        )}
      </Box>
    </Container>
  );
};

export default Report;
