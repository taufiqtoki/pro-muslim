import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Divider } from '@mui/material';
import { useAuth } from '../hooks/useAuth.ts';
import { doc, getDoc, collection, query, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import { hardReload } from '../utils/reload.ts';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);
  const [dataSource, setDataSource] = useState<'firebase' | 'local'>('firebase');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchSleepData = async () => {
      try {
        // First try to get data from Firebase
        const date = format(new Date(), 'yyyy-MM-dd');
        const sleepDoc = await getDoc(doc(db, `users/${user.uid}/sleep/${date}`));
        if (sleepDoc.exists()) {
          setTotalMinutes(sleepDoc.data().totalMinutes);
          setDataSource('firebase');
          setLoading(false);
          return;
        }
        
        // If not found in Firebase, try to get from localStorage
        const storedHistory = localStorage.getItem('sleepHistory');
        if (storedHistory) {
          const history = JSON.parse(storedHistory);
          // Calculate total minutes from sleep history
          const calcTotalMinutes = history.reduce((acc: number, entry: { duration: string }) => {
            const [hours, minutes] = entry.duration.split(':').map(Number);
            return acc + (hours * 60 + minutes);
          }, 0);
          
          setTotalMinutes(calcTotalMinutes);
          setDataSource('local');
          setLoading(false);
          return;
        }
        
        // No data found in either source
        setTotalMinutes(0);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sleep data:', err);
        
        // Fallback to localStorage if Firebase fetch fails
        try {
          const storedHistory = localStorage.getItem('sleepHistory');
          if (storedHistory) {
            const history = JSON.parse(storedHistory);
            // Calculate total minutes from sleep history
            const calcTotalMinutes = history.reduce((acc: number, entry: { duration: string }) => {
              const [hours, minutes] = entry.duration.split(':').map(Number);
              return acc + (hours * 60 + minutes);
            }, 0);
            
            setTotalMinutes(calcTotalMinutes);
            setDataSource('local');
            setError(null);
          } else {
            setError('No sleep data available');
          }
        } catch (localErr) {
          setError('Failed to fetch sleep data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSleepData();
  }, [user]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const deleteUserData = async (userId: string) => {
    // Define collections to delete and any subcollections if applicable.
    const collectionsToDelete: { name: string; subcollections?: string[] }[] = [
      { name: 'sleep' },
      { name: 'settings' },
      { name: 'tasbeehs' },
      { name: 'prayers' },
      { name: 'bucketLists', subcollections: ['items'] }
    ];

    // Helper function to commit batch deletes if pending count exists.
    const commitBatch = async (batch: ReturnType<typeof writeBatch>, count: number) => {
      if (count > 0) {
        await batch.commit();
      }
    };

    for (const { name, subcollections } of collectionsToDelete) {
      const colRef = collection(db, `users/${userId}/${name}`);
      const qSnap = await getDocs(query(colRef));
      let batch = writeBatch(db);
      let count = 0;

      for (const docSnap of qSnap.docs) {
        // If there are subcollections to delete, process them first.
        if (subcollections && subcollections.length) {
          for (const subName of subcollections) {
            const subColRef = collection(docSnap.ref, subName);
            const subSnap = await getDocs(query(subColRef));
            for (const subDoc of subSnap.docs) {
              batch.delete(subDoc.ref);
              count++;
              if (count >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
              }
            }
          }
        }
        batch.delete(docSnap.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      await commitBatch(batch, count);
    }

    // Optionally delete the top-level user document if it's not needed.
    await deleteDoc(doc(db, `users/${userId}`));
    
    return true;
  };

  const handleClearUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await deleteUserData(user.uid);
      
      // Also clear localStorage data
      localStorage.removeItem('sleepHistory');
      
      setTotalMinutes(0);
      setTimeout(() => {
        hardReload();
      }, 1500);
    } catch (err) {
      console.error('Clear data error:', err);
      setError('Failed to clear user data. Please try again.');
    } finally {
      setLoading(false);
      setClearDataModalOpen(false);
    }
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
      {dataSource === 'local' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          (Data from local storage)
        </Typography>
      )}
      <Button variant="contained" color="primary" onClick={() => navigate('/report')}>
        View Report
      </Button>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" color="error" gutterBottom>
        Danger Zone
      </Typography>
      <Button
        variant="outlined"
        color="error"
        onClick={() => setClearDataModalOpen(true)}
      >
        Clear All My Data
      </Button>

      <ConfirmationModal
        open={clearDataModalOpen}
        onClose={() => setClearDataModalOpen(false)}
        onConfirm={handleClearUserData}
        title="Clear User Data"
        message="This will permanently delete all your data including sleep records, settings, and other personal information. This action cannot be undone."
        confirmText="Delete All My Data"
      />
    </Box>
  );
};

export default Profile;
