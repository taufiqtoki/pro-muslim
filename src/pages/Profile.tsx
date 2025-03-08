import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { useAuth } from '../hooks/useAuth.ts';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchSleepData = async () => {
      try {
        const date = format(new Date(), 'yyyy-MM-dd');
        const sleepDoc = await getDoc(doc(db, `users/${user.uid}/sleep/${date}`));
        if (sleepDoc.exists()) {
          setTotalMinutes(sleepDoc.data().totalMinutes);
        }
      } catch (err) {
        setError('Failed to fetch sleep data');
      } finally {
        setLoading(false);
      }
    };

    fetchSleepData();
  }, [user]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Sleep Report
      </Typography>
      <Typography variant="body1">
        Total Time Slept Today: {formatTime(totalMinutes)}
      </Typography>
      <Button variant="contained" color="primary" onClick={() => navigate('/report')}>
        View Report
      </Button>
    </Box>
  );
};

export default Profile;
