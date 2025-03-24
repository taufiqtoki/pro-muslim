import React, { createContext, useContext, useState, useEffect } from 'react';
import { Track } from '../types/playlist';
import { useAuth } from '../hooks/useAuth.ts';
import { playlistService } from '../services/playlistService.ts';

interface QueueContextType {
  queueTracks: Track[];
  setQueueTracks: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  loadQueueTracks: () => Promise<Track[]>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queueTracks, setQueueTracks] = useState<Track[]>([]);
  const { user } = useAuth();

  const loadQueueTracks = async (): Promise<Track[]> => {
    if (!user) {
      const savedQueue = localStorage.getItem('queue');
      const tracks = savedQueue ? JSON.parse(savedQueue) : [];
      setQueueTracks(tracks);
      return tracks;
    }

    try {
      const queue = await playlistService.getOrCreateQueue(user.uid);
      setQueueTracks(queue.tracks);
      return queue.tracks;
    } catch (error) {
      console.error('Error loading queue tracks:', error);
      return [];
    }
  };

  // Initialize queue when component mounts or user changes
  useEffect(() => {
    const initializeQueue = async () => {
      if (!user) {
        // Use local storage for non-logged in users
        const savedQueue = localStorage.getItem('queue');
        setQueueTracks(savedQueue ? JSON.parse(savedQueue) : []);
        return;
      }

      try {
        // Create or get queue playlist
        const queue = await playlistService.getOrCreateQueue(user.uid);
        setQueueTracks(queue.tracks || []);
      } catch (error) {
        console.error('Error initializing queue:', error);
      }
    };

    initializeQueue();
  }, [user]);

  // Sync queue changes
  useEffect(() => {
    const syncQueue = async () => {
      if (!user) {
        localStorage.setItem('queue', JSON.stringify(queueTracks));
        return;
      }

      try {
        await playlistService.saveQueue(user.uid, queueTracks);
      } catch (error) {
        console.error('Error syncing queue:', error);
      }
    };

    syncQueue();
  }, [queueTracks, user]);

  const addToQueue = (track: Track) => {
    setQueueTracks(prev => [...prev, track]);
  };

  const removeFromQueue = (trackId: string) => {
    setQueueTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const clearQueue = () => {
    setQueueTracks([]);
  };

  const reorderQueue = (startIndex: number, endIndex: number) => {
    const newTracks = Array.from(queueTracks);
    const [removed] = newTracks.splice(startIndex, 1);
    newTracks.splice(endIndex, 0, removed);
    setQueueTracks(newTracks);
  };

  return (
    <QueueContext.Provider value={{
      queueTracks,
      setQueueTracks,
      addToQueue,
      removeFromQueue,
      clearQueue,
      reorderQueue,
      loadQueueTracks
    }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider');
  }
  return context;
};
