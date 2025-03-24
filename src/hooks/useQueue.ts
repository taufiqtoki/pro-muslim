import { useState, useCallback } from 'react';
import { Track } from '../types/playlist';

export interface UseQueueReturn {
  queueTracks: Track[];
  setQueueTracks: (tracks: Track[]) => void;
  addToQueue: (track: Track) => Promise<void>;
  removeFromQueue: (trackId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
}

export const useQueue = (): UseQueueReturn => {
  const [queueTracks, setQueueTracks] = useState<Track[]>([]);

  const addToQueue = useCallback(async (track: Track) => {
    setQueueTracks(prev => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback(async (trackId: string) => {
    setQueueTracks(prev => prev.filter(t => t.id !== trackId));
  }, []);

  const clearQueue = useCallback(async () => {
    setQueueTracks([]);
  }, []);

  return {
    queueTracks,
    setQueueTracks,
    addToQueue,
    removeFromQueue,
    clearQueue
  };
};
