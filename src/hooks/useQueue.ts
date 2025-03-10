import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.ts';
import { playlistService } from '../services/playlistService.ts';
import { Track } from '../types/playlist.ts';

export const useQueue = () => {
  const [queueTracks, setQueueTracks] = useState<Track[]>([]);
  const { user } = useAuth();

  // Load queue on mount and when user changes
  useEffect(() => {
    const loadQueue = async () => {
      if (user) {
        const tracks = await playlistService.getQueueTracks(user.uid);
        setQueueTracks(tracks);
      } else {
        // Load from localStorage for non-logged in users
        const savedQueue = localStorage.getItem('queue_tracks');
        setQueueTracks(savedQueue ? JSON.parse(savedQueue) : []);
      }
    };

    loadQueue();
  }, [user]);

  // Save queue whenever it changes
  useEffect(() => {
    if (user) {
      playlistService.updateQueue(user.uid, queueTracks);
    } else {
      localStorage.setItem('queue_tracks', JSON.stringify(queueTracks));
    }
  }, [queueTracks, user]);

  const addToQueue = async (track: Track) => {
    // Check for duplicates
    const isDuplicate = queueTracks.some(t => 
      t.url === track.url || 
      (t.type === 'youtube' && track.type === 'youtube' && 
       t.url.includes(track.url.split('v=')[1]))
    );

    if (isDuplicate) {
      throw new Error('This track is already in the queue');
      return;
    }

    setQueueTracks(prev => [...prev, track]);
  };

  const removeFromQueue = async (trackId: string) => {
    setQueueTracks(prev => prev.filter(track => track.id !== trackId));
  };

  const clearQueue = async () => {
    setQueueTracks([]);
  };

  return {
    queueTracks,
    addToQueue,
    removeFromQueue,
    clearQueue
  };
};
