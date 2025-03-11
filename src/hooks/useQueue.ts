import { useState, useEffect } from 'react';
import { Track } from '../types/playlist';

const QUEUE_STORAGE_KEY = 'audio_player_queue';

export const useQueue = () => {
  // Initialize state from localStorage
  const [queueTracks, setQueueTracks] = useState<Track[]>(() => {
    const savedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
    return savedQueue ? JSON.parse(savedQueue) : [];
  });

  // Save to localStorage whenever queue changes
  useEffect(() => {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueTracks));
  }, [queueTracks]);

  const addToQueue = async (track: Track) => {
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
