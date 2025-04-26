import { useEffect } from 'react';
import { Track } from '../types/playlist';
import { localFileService } from '../services/localFileService';

export const useLocalFiles = () => {
  const recreateFileUrl = async (track: Track) => {
    if (track.type !== 'local') return track.url;
    
    try {
      const stored = await localFileService.getFile(track.id);
      if (!stored) return null;
      // @ts-ignore - Ignore type mismatch for blob
      return URL.createObjectURL(stored.file);
    } catch (error) {
      console.error('Error recreating file URL:', error);
      return null;
    }
  };

  return { recreateFileUrl };
};
