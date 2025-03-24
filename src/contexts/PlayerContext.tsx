import React, { createContext, useContext, useState, useRef, useEffect, MutableRefObject } from 'react';
import { Track } from '../types/playlist.ts';

export type RepeatMode = 'none' | 'all' | 'one';

interface PlayerContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  togglePlay: () => void;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  youtubeRef: MutableRefObject<any>;
  handleNextTrack: () => void;
  handlePreviousTrack: () => void;
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubeRef = useRef<any>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();

      const timeUpdateHandler = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };

      const loadedMetadataHandler = () => {
        setDuration(audioRef.current?.duration || 0);
      };

      const endedHandler = () => {
        setIsPlaying(false);
        handleNextTrack();
      };

      const playHandler = () => {
        setIsPlaying(true);
      };

      const pauseHandler = () => {
        setIsPlaying(false);
      };

      audioRef.current.addEventListener('timeupdate', timeUpdateHandler);
      audioRef.current.addEventListener('loadedmetadata', loadedMetadataHandler);
      audioRef.current.addEventListener('ended', endedHandler);
      audioRef.current.addEventListener('play', playHandler);
      audioRef.current.addEventListener('pause', pauseHandler);

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', timeUpdateHandler);
          audioRef.current.removeEventListener('loadedmetadata', loadedMetadataHandler);
          audioRef.current.removeEventListener('ended', endedHandler);
          audioRef.current.removeEventListener('play', playHandler);
          audioRef.current.removeEventListener('pause', pauseHandler);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (!currentTrack) return;

    if (currentTrack.type === 'youtube' && youtubeRef.current?.internalPlayer) {
      if (isPlaying) {
        youtubeRef.current.internalPlayer.pauseVideo().catch(console.error);
      } else {
        youtubeRef.current.internalPlayer.playVideo().catch(console.error);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    console.log('Next track');
  };

  const handlePreviousTrack = () => {
    console.log('Previous track');
  };

  return (
    <PlayerContext.Provider value={{
      isPlaying,
      currentTrack,
      currentTime,
      duration,
      setIsPlaying,
      setCurrentTrack,
      setCurrentTime,
      setDuration,
      togglePlay,
      audioRef,
      youtubeRef,
      handleNextTrack,
      handlePreviousTrack,
      repeatMode,
      setRepeatMode,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
