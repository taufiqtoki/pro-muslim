import React, { useState, useRef, useEffect, useCallback } from 'react';
import { debounce } from '../hooks/useDebounce.ts';
import {
  Box, IconButton, Slider, Typography, TextField, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Grid, useTheme, Select, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Menu, Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import YouTube from 'react-youtube';
import axios from 'axios';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LanguageIcon from '@mui/icons-material/Language';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import YouTubeIcon from '@mui/icons-material/YouTube';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { usePlaylist } from '../hooks/usePlaylist.ts';
import { playlistService } from '../services/playlistService.ts';
import { Track, Playlist } from '../types/playlist.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { db } from '../firebase.ts';
import { getVideoDetails, validateYouTubeUrl, formatDuration, extractYoutubePlaylistId } from '../utils/youtube.ts';
import { getAudioMetadata } from '../utils/audioMetadata.ts';
import PlaybackControls from './AudioPlayer/PlaybackControls.tsx';
import SpeedControls from './AudioPlayer/SpeedControls.tsx';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import { useQueue } from '../hooks/useQueue.ts';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { localFileService } from '../services/localFileService.ts';
import { useDragAndDrop } from '../hooks/useDragAndDrop.ts';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { usePlayer } from '../contexts/PlayerContext.tsx';
import MiniPlayer from './AudioPlayer/MiniPlayer.tsx';
import { RepeatMode } from '../types/player.ts';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { logger } from '../utils/logger.ts';
import { FixedSizeList as List } from 'react-window';

const FavoriteIconComponent: React.FC<{ 
  isFavorite: boolean;
  onClick: () => void;
}> = ({ isFavorite, onClick }) => (
  <IconButton 
    size="small" 
    onClick={onClick}
    sx={{
      '&:hover': {
        color: '#ff69b4', // Pink color on hover
      },
      ...(isFavorite && {
        color: '#ff1493', // Deeper pink when favorited
      })
    }}
  >
    {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
  </IconButton>
);

const SUPPORTED_FORMATS = [
  'audio/*', 'video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska', 'video/quicktime',
  'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv'
];

const loadQueueTracks = async () => {
  // Implementation will depend on your queue storage method
  const savedQueue = localStorage.getItem('queue');
  return savedQueue ? JSON.parse(savedQueue) : [];
};

const AudioPlayer: React.FC = () => {
  const { showToast } = useToast();
  const {
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
    repeatMode,
    setRepeatMode
  } = usePlayer();
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | undefined>(undefined);
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [newPlaylistDialog, setNewPlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [youtubePlaylistDialog, setYoutubePlaylistDialog] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string>('default');
  const { playlist, loading, error, addTrack, removeTrack, updateTrack, refreshPlaylist, updatePlaylist } = usePlaylist(currentPlaylistId);
  const { queueTracks, setQueueTracks, addToQueue, removeFromQueue, clearQueue } = useQueue();
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [newPlaylistData, setNewPlaylistData] = useState({ name: '', type: 'custom' as const, youtubeUrl: '' });
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [editingPlaylistName, setEditingPlaylistName] = useState<string | null>(null);
  const [queuePlaylistUrl, setQueuePlaylistUrl] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [volume, setVolume] = useState(100);
  const [previousVolume, setPreviousVolume] = useState(100);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [volumeTimeout, setVolumeTimeout] = useState<NodeJS.Timeout | null>(null);
  const queueDragDrop = useDragAndDrop();
  const playlistDragDrop = useDragAndDrop();
  const [playlistMenu, setPlaylistMenu] = useState<null | HTMLElement>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const youtubeOpts = {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      enablejsapi: 1,
      playsinline: 1
    },
  };

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      pr: 0, // Remove right padding to align button perfectly
      '& .MuiOutlinedInput-notchedOutline': {
        borderRight: 'none', // Remove right border
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderRight: 'none', // Keep removing right border on hover
      },
    }
  };

  const addButtonStyles = {
    height: '40px', // Match TextField height
    minWidth: '40px',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginLeft: '-1px', // Overlap the border
    '&:hover': {
      marginLeft: '-1px', // Maintain overlap on hover
    }
  };

  const loadPlaylists = async () => {
    if (user) {
      try {
        const userPlaylists = await playlistService.getUserPlaylists(user.uid);
        setPlaylists(userPlaylists);
      } catch (error) {
        logger.error('Error loading playlists:', error);
        showToast('Error loading playlists', 'error');
      }
    } else {
      const localPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
      setPlaylists(localPlaylists);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [user]);

  const handleCreatePlaylist = async () => {
    if (user && newPlaylistData.name) {
      try {
        const newPlaylistId = await playlistService.createPlaylist(user.uid, {
          name: newPlaylistData.name, description: '', tracks: [], isPublic: false, type: 'custom',
          createdAt: Date.now(), updatedAt: Date.now()
        });
        setNewPlaylistDialog(false);
        setNewPlaylistData(prev => ({ ...prev, name: '' }));
        showToast('Playlist created successfully', 'success');
        await loadPlaylists();
        setCurrentPlaylistId(newPlaylistId);
      } catch (error) {
        logger.error('Error creating playlist:', error);
        showToast('Error creating playlist', 'error');
      }
    }
  };

  const handleAddTrack = async (target: 'queue' | 'playlist') => {
    const urlToAdd = target === 'queue' ? queuePlaylistUrl : playlistUrl;
    if (!urlToAdd) return;
    
    try {
      const videoId = validateYouTubeUrl(urlToAdd);
      if (!videoId) {
        showToast('Invalid YouTube URL', 'error');
        return;
      }
      const trackData = await getVideoDetails(videoId);
      if (trackData) {
        const newTrack: Track = {
          id: Date.now().toString(),
          url: urlToAdd,
          name: trackData.name,
          duration: trackData.duration,
          thumbnail: trackData.thumbnail,
          addedAt: Date.now(),
          type: 'youtube',
          videoId: videoId // Add videoId to track data
        };

        // Strictly separate queue and playlist additions
        if (target === 'queue') {
          await addToQueue(newTrack);
          setQueuePlaylistUrl('');
        } else if (target === 'playlist') {
          await addTrack(newTrack);
          setPlaylistUrl('');
        }
        
        showToast('Track added successfully', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Error adding track', 'error');
    }
  };

  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        try {
          const userRef = doc(db, `users/${user.uid}`);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFavorites(userData.favorites || []);
            logger.log('Loaded favorites:', userData.favorites || []); // Add this line
            localStorage.setItem('favorites', JSON.stringify(userData.favorites || []));
          }
        } catch (error) {
          logger.error('Error loading favorites:', error);
          showToast('Error loading favorites', 'error');
        }
      } else {
        const localFavorites = localStorage.getItem('favorites');
        if (localFavorites) {
          const parsedFavorites = JSON.parse(localFavorites);
          setFavorites(parsedFavorites);
          logger.log('Loaded local favorites:', parsedFavorites); // Add this line
        }
      }
    };
    loadFavorites();
  }, [user]);

  const toggleFavorite = async (trackId: string) => {
    try {
      // Find the track from either queue or current playlist
      const track = [...queueTracks, ...(playlist?.tracks || [])].find(t => t.id === trackId);
      if (!track) {
        showToast('Track not found', 'error');
        return;
      }

      const isFavorite = favorites.includes(trackId);
      const newFavorites = isFavorite ? favorites.filter(id => id !== trackId) : [...favorites, trackId];
      
      // Update favorites array in state and localStorage
      setFavorites(newFavorites);
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      logger.log('Updated favorites:', newFavorites); // Add this line
      
      if (user) {
        // Update favorites in user document
        await playlistService.toggleFavorite(user.uid, trackId, !isFavorite);
        
        // No need to manually modify favorites playlist - it will be updated through usePlaylist hook
        if (currentPlaylistId === 'favorites') {
          await refreshPlaylist();
        }
      }

      showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success');
    } catch (error) {
      logger.error('Error toggling favorite:', error);
      showToast('Error updating favorites', 'error');
    }
  };

  const handlePlayPause = async () => {
    const currentTrack = getCurrentTrack();
    if (!currentTrack) return;
    try {
      if (currentTrack.type === 'youtube') {
        if (youtubeRef.current?.internalPlayer) {
          if (isPlaying) await youtubeRef.current.internalPlayer.pauseVideo();
          else await youtubeRef.current.internalPlayer.playVideo();
          setIsPlaying(!isPlaying);
        } else {
          await handlePlayTrack(currentTrack);
        }
      } else if (currentTrack.type === 'local') {
        // Get file before playing
        const file = await localFileService.getFile(currentTrack.id);
        if (!file) {
          showToast('Error: File not found', 'error');
          return;
        }
        
        if (audioRef.current) {
          if (isPlaying) {
            audioRef.current.pause();
          } else {
            const objectUrl = URL.createObjectURL(file);
            audioRef.current.src = objectUrl;
            audioRef.current.onloadeddata = () => {
              URL.revokeObjectURL(objectUrl);
            };
            await audioRef.current.play();
          }
          setIsPlaying(!isPlaying);
        }
      }
    } catch (error) {
      logger.error('Error in handlePlayPause:', error);
      showToast('Error playing track', 'error');
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || isDragging) return;

    const time = audio.currentTime;
    setCurrentTime(time);
    setSliderValue(time);
    setDuration(audio.duration || 0);

    // Update playback position state
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setPositionState({
        duration: audio.duration || 0,
        position: time,
        playbackRate: audio.playbackRate
      });
    }
  };

  const handleSeek = (_event: any, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setSliderValue(value);
    setCurrentTime(value);
    if (youtubeVideoId && youtubeRef.current?.internalPlayer) {
      youtubeRef.current.internalPlayer.seekTo(value, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  const handleSliderChange = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    setIsDragging(true);
    handleSeek(_event, newValue);
  };

  const handleSliderChangeCommitted = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    setIsDragging(false);
    handleSeek(_event, newValue);
  };

  useEffect(() => {
    let timeUpdateInterval: NodeJS.Timeout;
    if (youtubeVideoId && isPlaying) {
      timeUpdateInterval = setInterval(async () => {
        if (youtubeRef.current?.internalPlayer && !isDragging) {
          try {
            const currentTime = await youtubeRef.current.internalPlayer.getCurrentTime();
            const duration = await youtubeRef.current.internalPlayer.getDuration();
            setCurrentTime(currentTime);
            setSliderValue(currentTime);
            setDuration(duration);
          } catch (error) {
            logger.error('Error updating YouTube time:', error);
          }
        }
      }, 1000);
    }
    return () => {
      if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    };
  }, [youtubeVideoId, isPlaying, isDragging]);

  const handleNextTrack = () => {
    const tracks = getTracks();
    if (tracks.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    
    // If we've reached the end of the queue, stop playing
    if (nextIndex === 0) {
      setIsPlaying(false);
      return;
    }
    
    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
    setIsPlaying(false);
    const nextTrack = tracks[nextIndex];
    if (nextTrack) handlePlayTrack(nextTrack).then(() => setIsPlaying(true));
  };

  const handlePreviousTrack = () => {
    const tracks = getTracks();
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIndex);
    setCurrentTime(0);
    setIsPlaying(false);
    const prevTrack = tracks[prevIndex];
    if (prevTrack) handlePlayTrack(prevTrack).then(() => setIsPlaying(true));
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const seek = async (seconds: number) => {
    const currentTrack = getCurrentTrack();
    if (!currentTrack) return;
    try {
      if (currentTrack.type === 'youtube' && youtubeRef.current?.internalPlayer) {
        const currentTime = await youtubeRef.current.internalPlayer.getCurrentTime();
        const newTime = Math.min(Math.max(0, currentTime + seconds), duration);
        await youtubeRef.current.internalPlayer.seekTo(newTime, true);
        setCurrentTime(newTime);
        setSliderValue(newTime);
      } else if (audioRef.current) {
        const newTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setSliderValue(newTime);
      }
    } catch (error) {
      logger.error('Error seeking:', error);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const currentTrack = getCurrentTrack();
    if (!currentTrack) return;
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/;
    if (youtubeRegex.test(currentTrack.url)) {
      youtubeRef.current.internalPlayer.setPlaybackRate(rate);
    } else if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const extractAudioFromVideo = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination);
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = async () => {
        const mediaRecorder = new MediaRecorder(destination.stream);
        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(blob);
          resolve(audioUrl);
        };
        video.play();
        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
          video.pause();
          URL.revokeObjectURL(video.src);
        }, video.duration * 1000);
      };
      video.onerror = reject;
    });
  };

  const addLocalTrackToPlaylist = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    for (const file of files) {
      try {
        const metadata = await getAudioMetadata(file);
        const fileId = await localFileService.saveFile(file);
        
        const newTrack: Track = {
          id: fileId,
          url: fileId, // Store ID instead of blob URL
          name: metadata.name || file.name,
          duration: metadata.duration,
          thumbnail: '',
          addedAt: Date.now(),
          type: 'local',
          metadata: {
            lastModified: file.lastModified,
            size: file.size,
            mimeType: file.type
          }
        };

        const isQueue = event.target.dataset.target === 'queue';
        if (isQueue) {
          await addToQueue(newTrack);
        } else {
          await addTrack(newTrack);
        }
      } catch (error) {
        logger.error('Error adding track:', error);
        showToast('Error adding track', 'error');
      }
    }
  };

  const handlePlayTrack = async (track: Track) => {
    try {
      setCurrentTrack(track);
      updateMediaSessionMetadata(track);
      
      if (youtubeVideoId && track.type === 'local') {
        if (youtubeRef.current?.internalPlayer) {
          await youtubeRef.current.internalPlayer.stopVideo();
        }
        setYoutubeVideoId(undefined);
      }

      if (track.type === 'youtube') {
        const videoId = validateYouTubeUrl(track.url);
        if (!videoId) throw new Error('Invalid YouTube URL');
        
        setYoutubeVideoId(videoId);
        if (youtubeRef.current?.internalPlayer) {
          await youtubeRef.current.internalPlayer.loadVideoById(videoId);
          setIsPlaying(true);
        }
      } else if (track.type === 'local') {
        const file = await localFileService.getFile(track.id);
        if (!file) throw new Error('File not found');
        
        const objectUrl = URL.createObjectURL(file);
        if (audioRef.current) {
          audioRef.current.src = objectUrl;
          await audioRef.current.play();
          setIsPlaying(true);
          
          audioRef.current.onloadeddata = () => {
            URL.revokeObjectURL(objectUrl);
          };
        }
      }
    } catch (error) {
      showToast(error.message || 'Error playing track', 'error');
      throw error; // Re-throw to handle in calling function
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const track = playlist?.tracks?.find(t => t.id === trackId);
      if (track?.type === 'local' && track.url) {
        await localFileService.deleteFile(track.url);
      }
      if (favorites.includes(trackId)) {
        const newFavorites = favorites.filter(id => id !== trackId);
        setFavorites(newFavorites);
        localStorage.setItem('favorites', JSON.stringify(newFavorites));
        if (user) await playlistService.toggleFavorite(user.uid, trackId, false);
      }
      await removeTrack(trackId);
      showToast('Track removed successfully', 'success');
      if (currentPlaylistId === 'favorites') refreshPlaylist();
    } catch (error) {
      showToast('Error removing track', 'error');
      logger.error('Error removing track:', error);
    }
  };

  const handleTrackSelection = async (index: number) => {
    const track = getTracks()[index];
    if (!track) return;
    try {
      setCurrentTrackIndex(index);
      setCurrentTime(0);
      setSliderValue(0);
      setIsPlaying(false);
      await handlePlayTrack(track);
    } catch (error) {
      logger.error('Error selecting track:', error);
      showToast('Error playing track', 'error');
    }
  };

  const handleYoutubeStateChange = (event: any) => {
    switch (event.data) {
      case YouTube.PlayerState.ENDED:
        handleTrackEnd();
        break;
      case YouTube.PlayerState.PLAYING:
        setIsPlaying(true);
        startYoutubeTimeUpdate();
        break;
      case YouTube.PlayerState.PAUSED:
        setIsPlaying(false);
        stopYoutubeTimeUpdate();
        break;
    }
  };

  const startYoutubeTimeUpdate = () => {
    stopYoutubeTimeUpdate();
    timeUpdateIntervalRef.current = setInterval(async () => {
      if (youtubeRef.current?.internalPlayer && !isDragging) {
        try {
          const currentTime = await youtubeRef.current.internalPlayer.getCurrentTime();
          const duration = await youtubeRef.current.internalPlayer.getDuration();
          setCurrentTime(currentTime);
          setSliderValue(currentTime);
          setDuration(duration);
        } catch (error) {
          logger.error('Error updating YouTube time:', error);
        }
      }
    }, 1000);
  };

  const stopYoutubeTimeUpdate = () => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopYoutubeTimeUpdate();
      if (youtubeRef.current?.internalPlayer) youtubeRef.current.internalPlayer.stopVideo();
    };
  }, []);

  const renderYoutubePlayer = () => (
    <Box sx={{ display: 'none' }}>
      <YouTube
        videoId={youtubeVideoId || ''}
        ref={youtubeRef}
        onStateChange={handleYoutubeStateChange}
        onReady={async (event) => {
          const player = event.target;
          player.setPlaybackQuality('tiny');
          player.setVolume(100);
          const duration = player.getDuration();
          setDuration(duration);
          if (isPlaying) {
            try {
              await player.playVideo();
            } catch (error) {
              logger.error('Error auto-playing:', error);
            }
          }
        }}
        onError={(error) => {
          logger.error('YouTube player error:', error);
          showToast('Error playing YouTube track', 'error');
        }}
        opts={youtubeOpts}
      />
    </Box>
  );

  const handleImportYoutubePlaylist = async () => {
    try {
      setImportLoading(true);
      
      // Fix: Only use the correct URL based on which button was clicked
      const url = queuePlaylistUrl || newPlaylistData.youtubeUrl;
      const isQueueImport = Boolean(queuePlaylistUrl);
      
      const playlistId = extractYoutubePlaylistId(url);
      if (!playlistId) {
        showToast('Invalid YouTube playlist URL', 'error');
        return;
      }

      const details = await playlistService.fetchYouTubePlaylistDetails(playlistId);
      setImportProgress({ current: 0, total: details.itemCount });
      const tracks = await playlistService.fetchYouTubePlaylistTracks(playlistId);

      // Fix: Ensure tracks are added to queue when initiated from queue panel
      if (isQueueImport) {
        for (const track of tracks) {
          await addToQueue(track);
          setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
        setQueuePlaylistUrl(''); // Clear queue URL
        showToast('Playlist imported to queue successfully', 'success');
      } else {
        // Import as new playlist only if not from queue
        if (user) {
          const newPlaylistId = await playlistService.importYouTubePlaylist(
            user.uid,
            playlistId,
            undefined,
            (current) => setImportProgress(prev => ({ ...prev, current }))
          );
          await loadPlaylists();
          setCurrentPlaylistId(newPlaylistId);
          setNewPlaylistData(prev => ({ ...prev, youtubeUrl: '' })); // Clear playlist URL
          showToast(`Playlist "${details.title}" imported successfully`, 'success');
        }
      }

      setYoutubePlaylistDialog(false);
    } catch (error) {
      showToast(error.message || 'Error importing playlist', 'error');
    } finally {
      setImportLoading(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const cellStyles = {
    padding: '0 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    height: '36px',
    lineHeight: '36px',
    '& > span': {
      display: 'block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }
  };

  const renderEmptyRows = (count: number) => (
    Array.from({ length: count }).map((_, index) => (
      <TableRow 
        // Change key to include a unique prefix and parent list identifier
        key={`empty-${currentPlaylistId}-${index}`}
        sx={{ 
          height: '36px',
          minHeight: '36px',
          maxHeight: '36px',
        }}
      >
        <TableCell 
          colSpan={5} 
          sx={{ 
            height: '36px',
            minHeight: '36px',
            maxHeight: '36px',
            borderBottom: index === count - 1 ? 'none' : '1px solid',
            borderColor: 'divider',
            padding: '0 2px',
          }} 
        />
      </TableRow>
    ))
  );

  const tableContainerStyles = {
    flex: 1,
    height: '275px',
    overflow: 'auto', // Change to 'auto' to enable scrolling
    borderBottom: 'none',
    borderColor: 'divider',
    '& .MuiTable-root': {
      tableLayout: 'fixed',
      borderCollapse: 'separate',
      borderSpacing: 0,
    },
    '& .MuiTableHead-root': {
      position: 'sticky',
      top: 0,
      zIndex: 2,
      backgroundColor: 'background.paper',
    },
    '& .MuiTableBody-root': {
      '& .MuiTableRow-root': {
        height: '40px !important', // Force consistent height
      }
    },
    '& .MuiTableCell-root': {
      height: '36px',
      minHeight: '36px',
      maxHeight: '36px',
      lineHeight: '36px',
      padding: '0 2px',
      borderBottom: '1px solid',
      borderColor: 'divider',
    }
  };

  const QUEUE_EMPTY_ROWS = 5;    // Changed from 6 to 5
  const PLAYLIST_EMPTY_ROWS = 4; // Changed from 5 to 4

  const getTracks = () => {
    // Always return queue tracks
    return queueTracks || [];
  };

  const getCurrentTrack = (): Track | null => {
    const tracks = getTracks();
    return tracks.length > 0 ? tracks[currentTrackIndex] : null;
  };

  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setVolume(value);
    if (youtubeRef.current?.internalPlayer) {
      youtubeRef.current.internalPlayer.setVolume(value);
    }
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  };

  const toggleMute = () => {
    if (isVolumeOpen) {
      if (volume > 0) {
        setPreviousVolume(volume);
        handleVolumeChange({} as Event, 0);
      } else {
        handleVolumeChange({} as Event, previousVolume);
      }
    } else {
      handleVolumeOpen();
    }
  };

  const handleVolumeOpen = () => {
    setIsVolumeOpen(true);
    if (volumeTimeout) clearTimeout(volumeTimeout);
    const timeout = setTimeout(() => {
      setIsVolumeOpen(false);
    }, 3000);
    setVolumeTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (volumeTimeout) clearTimeout(volumeTimeout);
    };
  }, [volumeTimeout]);

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeOffIcon />;
    if (volume < 30) return <VolumeMuteIcon />;
    if (volume < 70) return <VolumeDownIcon />;
    return <VolumeUpIcon />;
  };

  const renderMainContent = () => {
    const currentTrack = getCurrentTrack();
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
        {currentTrack?.thumbnail && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img
              src={currentTrack.thumbnail}
              alt="Track Thumbnail"
              style={{
                width: '150px', 
                height: '150px',
                borderRadius: '12px', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', 
                objectFit: 'cover',
              }}
            />
          </Box>
        )}
        {renderMainTitle()}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          width: '100%',
          gap: 1, // Increased gap for better spacing
          px: 1 // Add horizontal padding
        }}>
          <Typography sx={{ 
            color: 'text.secondary',
            minWidth: '32px', // Reduced fixed width
            textAlign: 'right',
            fontSize: '0.875rem',
            marginRight: '2px' // Added right margin
          }}>
            {formatTime(currentTime)}
          </Typography>

          <Box sx={{ flex: 1 }}>
            <Slider
              value={sliderValue}
              max={duration || 100}
              onChange={handleSliderChange}
              onChangeCommitted={handleSliderChangeCommitted}
              sx={{ 
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12
                }
              }}
            />
          </Box>

          <Typography sx={{ 
            color: 'text.secondary',
            minWidth: '32px', // Reduced fixed width
            textAlign: 'left',
            fontSize: '0.875rem'
          }}>
            {formatTime(duration)}
          </Typography>

          <Box sx={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px' // Match other elements width
          }}>
            <IconButton 
              onClick={toggleMute}
              onMouseEnter={handleVolumeOpen}
              size="small"
              sx={{ p: 0.5 }} // Reduced padding further
            >
              {getVolumeIcon()}
            </IconButton>
            {isVolumeOpen && (
              <Paper 
                sx={{
                  position: 'absolute',
                  // top: '-90px', // Adjusted to match new height
                  left: '50%',
                  transform: 'translateX(-50%)',
                  p: 2,
                  width: 30,
                  height: 80, // Changed from 100 to 90
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 4,
                  boxShadow: 3
                }}
                onMouseEnter={() => {
                  if (volumeTimeout) clearTimeout(volumeTimeout);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setIsVolumeOpen(false);
                  }, 3000);
                  setVolumeTimeout(timeout);
                }}
              >
                <Slider
                  orientation="vertical"
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                  min={0}
                  max={100}
                  sx={{ height: '100%' }}
                />
              </Paper>
            )}
          </Box>
        </Box>
        <Box sx={{ width: '100%', mb: 1, overflow: 'auto' }}>
          <PlaybackControls
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onNext={handleNextTrack}
            onPrevious={handlePreviousTrack}
            onSeek={seek}
            repeatMode={repeatMode}
            onRepeatModeChange={setRepeatMode}
            isShuffled={isShuffled}
            onShuffleToggle={handleShuffleToggle}
          />
        </Box>

        <Box sx={{ width: '100%', overflow: 'auto' }}>
          <SpeedControls onSpeedChange={changePlaybackRate} />
        </Box>
        <IconButton
          onClick={() => setIsMinimized(true)}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseFullscreenIcon />
        </IconButton>
      </Paper>
    );
  };

  const renderMainTitle = () => (
    <Box sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px' }}>
      <Typography
        variant="h6"
        align="center"
        sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.primary', lineHeight: '40px' }}
      >
        {getCurrentTrack()?.name || 'No Track Selected'}
      </Typography>
    </Box>
  );

  const renderQueueTrackRow = (track: Track, index: number) => (
    <Draggable 
      // Add index to make key more unique
      key={`queue-${track.id}-${index}`} 
      draggableId={track.id} 
      index={index}
    >
      {(provided) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            backgroundColor: index % 2 === 0 ? 'grey.50' : 'inherit',
            '&:hover': { 
              backgroundColor: index === currentTrackIndex ? 'primary.dark' : 'action.hover' 
            },
            ...(index === currentTrackIndex && { 
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiTableCell-root': {
                color: 'inherit'
              }
            }),
          }}
        >
          <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              animation: index === currentTrackIndex && isPlaying ? 'pulse 1s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              }
            }}>
              {index === currentTrackIndex ? (
                <MusicNoteIcon sx={{ color: isPlaying ? 'inherit' : 'text.secondary' }} />
              ) : (
                track.type === 'youtube' ? <LanguageIcon /> : <InsertDriveFileIcon />
              )}
            </Box>
          </TableCell>
          <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
          <TableCell 
            onClick={() => handleTrackNameClick(index)}
            sx={{ 
              ...cellStyles, 
              py: 1, 
              px: { xs: 0.5, sm: 1 }, 
              typography: 'body2',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            <span>{track.name}</span>
          </TableCell>
          <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>
            {formatDuration(track.duration)}
          </TableCell>
          <TableCell sx={{ p: 0 }}>
            <Box sx={actionButtonsSx}>
              <FavoriteIconComponent 
                isFavorite={favorites.includes(track.id)}
                onClick={() => toggleFavorite(track.id)}
              />
              <IconButton size="small" onClick={() => removeFromQueue(track.id)}>
                <DeleteIcon />
              </IconButton>
              <Box {...provided.dragHandleProps} sx={{ display: 'flex', cursor: 'grab', ml: -0.5 }}>
                <DragHandleIcon />
              </Box>
            </Box>
            </TableCell>
          </TableRow>
      )}
    </Draggable>
  );

  const renderQueueHeader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">Queue</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={`Shuffle: ${isShuffled ? 'On' : 'Off'}`}>
          <IconButton 
            onClick={handleShuffleToggle}
            color={isShuffled ? 'primary' : 'default'}
            size="small"
          >
            <ShuffleIcon />
          </IconButton>
        </Tooltip>
        <IconButton 
          onClick={clearQueue}
          title="Clear queue"
          size="small"
          color="error"
        >
          <ClearAllIcon />
        </IconButton>
      </Box>
    </Box>
  );

  const tableStyles = {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: 'separate',
    borderSpacing: 0,
    '& .MuiTableHead-root': {
      '& .MuiTableCell-root': {
        fontWeight: 'bold',
        backgroundColor: 'background.paper',
        height: '36px',
      }
    },
    '& .MuiTableRow-root': {
      height: '36px',
      '&:hover': {
        backgroundColor: 'action.hover',
      }
    },
    '& .MuiTableCell-root': {
      borderBottom: '1px solid',
      borderColor: 'divider',
      padding: '0 4px',
      height: '36px',
      lineHeight: '36px',
      fontSize: '0.875rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    // Column widths using percentages for consistent sizing
    '& .MuiTableCell-root:nth-of-type(1)': { width: '8%' },  // Icon
    '& .MuiTableCell-root:nth-of-type(2)': { width: '8%' },  // Number
    '& .MuiTableCell-root:nth-of-type(3)': { width: '49%' }, // Name
    '& .MuiTableCell-root:nth-of-type(4)': { width: '15%' }, // Duration
    '& .MuiTableCell-root:nth-of-type(5)': { width: '20%' }, // Actions
  };

  const renderTableHeader = (isQueue: boolean) => (
    <TableHead>
      <TableRow>
        <TableCell padding="none" align="center"></TableCell>
        <TableCell padding="none" align="center">#</TableCell>
        <TableCell padding="none" align="left">Name</TableCell>
        <TableCell padding="none" align="center">Length</TableCell>
        <TableCell padding="none" align="center">Actions</TableCell>
      </TableRow>
    </TableHead>
  );

  const commonTableSx = {
    tableLayout: 'fixed' as const, // Fix TypeScript error
    width: '100%',
    '& .MuiTableCell-root': {
      height: '36px',
      padding: 0,  // Remove all padding
      borderBottom: '1px solid',
      borderColor: 'divider',
      fontSize: '0.875rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
      lineHeight: '36px',
      '&:not(:nth-of-type(3))': {  // Apply to all cells except Name column (3rd)
        textAlign: 'center',
        justifyContent: 'center',
        '& .MuiBox-root': {
          justifyContent: 'center'
        }
      },
      '&:nth-of-type(3)': {  // Name column
        paddingLeft: '4px',  // Keep minimal padding for name only
      },
      // Single set of percentage-based widths for all screen sizes
      '&:nth-of-type(1)': { width: '8%' },     // Icon
      '&:nth-of-type(2)': { width: '8%' },     // Number
      '&:nth-of-type(4)': { width: '15%' },    // Duration
      '&:nth-of-type(5)': { width: '25%' },    // Actions
    }
  };

  const actionButtonsSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Changed from flex-end to center
    gap: 0, // Removed gap between buttons
    '& .MuiIconButton-root': {
      padding: '2px', // Reduced padding around icons
      margin: '0 -1px', // Negative margin to bring buttons closer
    }
  };

  // Update table container styles
  const tableContainerSx = {
    height: '275px',
    overflow: 'auto',
    scrollbarWidth: 'thin' as const,
    scrollbarColor: 'rgba(0,0,0,0.2) transparent',
    '&::-webkit-scrollbar': {
      width: '6px',
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: '3px',
    }
  };

  const handleQueueUrlSubmit = async () => {
    await handleAddTrack('queue');
  };

  const handlePlaylistUrlSubmit = async () => {
    await handleAddTrack('playlist');
  };

  const handleQueueDrop = async (url: string) => {
    try {
      const videoId = validateYouTubeUrl(url);
      if (!videoId) {
        showToast('Invalid YouTube URL', 'error');
        return;
      }
      const trackData = await getVideoDetails(videoId);
      if (trackData) {
        const newTrack: Track = {
          id: Date.now().toString(),
          url: url,
          name: trackData.name,
          duration: trackData.duration,
          thumbnail: trackData.thumbnail,
          addedAt: Date.now(),
          type: 'youtube',
          videoId: videoId
        };
        await addToQueue(newTrack);
        showToast('Track added to queue', 'success');
      }
    } catch (error) {
      logger.error('Error processing dropped URL:', error);
      showToast('Error adding URL to queue', 'error');
    }
  };

  const handlePlaylistDrop = async (url: string) => {
    try {
      const videoId = validateYouTubeUrl(url);
      if (!videoId) {
        showToast('Invalid YouTube URL', 'error');
        return;
      }
      const trackData = await getVideoDetails(videoId);
      if (trackData && currentPlaylistId) {
        const newTrack: Track = {
          id: Date.now().toString(),
          url: url,
          name: trackData.name,
          duration: trackData.duration,
          thumbnail: trackData.thumbnail,
          addedAt: Date.now(),
          type: 'youtube',
          videoId: videoId
        };
        await addTrack(newTrack);
        showToast('Track added to playlist', 'success');
      }
    } catch (error) {
      logger.error('Error processing dropped URL:', error);
      showToast('Error adding URL to playlist', 'error');
    }
  };

  const renderQueuePanel = () => (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '405px',
        position: 'relative',
        ...(queueDragDrop.isDragging && {
          '&::after': {
            content: '"Drop YouTube URL or files here"',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'primary.main',
            fontWeight: 'bold',
            zIndex: 2,
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '1rem',
            borderRadius: '4px',
          }
        })
      }}
      onDragOver={queueDragDrop.handleDragOver}
      onDragLeave={queueDragDrop.handleDragLeave}
      onDrop={(e) => queueDragDrop.handleDrop(
        e,
        (files) => {
          const event = { target: { files, dataset: { target: 'queue' } } } as any;
          addLocalTrackToPlaylist(event);
        },
        handleQueueDrop
      )}
    >
      {renderQueueHeader()}
      <TableContainer sx={tableContainerSx}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="queue">
            {(provided) => (
              <Table size="small" stickyHeader sx={commonTableSx}>
                {renderTableHeader(true)}
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {queueTracks.map((track, index) => renderQueueTrackRow(track, index))}
                  {provided.placeholder}
                  {queueTracks.length < 5 && renderEmptyRows(5 - queueTracks.length)}
                </TableBody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </TableContainer>
      <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            label="YouTube URL"
            size="small"
            value={queuePlaylistUrl}
            onChange={(e) => setQueuePlaylistUrl(e.target.value)}
            sx={{ flex: 1, ...textFieldStyles }}
            InputProps={{
              endAdornment: (
                <Button
                  variant="contained"
                  onClick={handleQueueUrlSubmit}
                  size="small"
                  sx={addButtonStyles}
                >
                  <AddIcon sx={{ fontSize: '20px' }} />
                </Button>
              ),
            }}
          />
          <Button
            variant="contained"
            component="label"
            startIcon={<InsertDriveFileIcon />}
            color="secondary"
          >
            Add File
            <input
              type="file"
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={addLocalTrackToPlaylist}
              multiple
              hidden
              data-target="queue"  // Added this attribute
            />
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<YouTubeIcon />}
            onClick={() => setYoutubePlaylistDialog(true)}
          >
            Import YT List to Queue
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setNewPlaylistDialog(true)}
            startIcon={<SaveIcon />}
          >
            Queue
          </Button>
        </Box>
      </Box>
    </Paper>
  );

  const renderPlaylistTrackRow = (track: Track, index: number) => {
    if (!track) return null;
    return (
      <TableRow
        // Add playlist ID to make key unique
        key={`playlist-${currentPlaylistId}-${track.id}-${index}`}
        sx={{
          backgroundColor: index % 2 === 0 ? 'grey.50' : 'inherit',
          '&:hover': { backgroundColor: 'action.hover' },
          ...(index === currentTrackIndex && { backgroundColor: 'action.selected' }),
        }}
      >
        <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%' 
          }}>
            {track.type === 'youtube' ? <LanguageIcon /> : <InsertDriveFileIcon />}
          </Box>
        </TableCell>
        <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
        <TableCell sx={{ ...cellStyles, py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>
          <span>{track.name}</span>
        </TableCell>
        <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>{formatDuration(track.duration)}</TableCell>
        <TableCell sx={{ p: 0 }}> {/* Removed cell padding */}
          <Box sx={actionButtonsSx}>
            <IconButton size="small" onClick={() => addToQueue(track)}>
              <QueueMusicIcon />
            </IconButton>
            <IconButton size="small" onClick={() => {
                const newName = prompt('Edit track name:', track.name);
                if (newName && newName !== track.name) updateTrack(track.id, { name: newName });
              }}
              title="Edit name"
            >
              <EditIcon />
            </IconButton>
            <IconButton size="small" onClick={() => handleRemoveTrack(track.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  const getFavoritesPlaylist = async (): Promise<Playlist> => {
    const favoriteTracks: Track[] = [];
    
    // Get all tracks from both queue and playlists
    const allTracks = [
      ...queueTracks,
      ...playlists.flatMap(p => p.tracks || [])
    ];

    // Filter unique tracks by ID that are in favorites
    for (const trackId of favorites) {
      const track = allTracks.find(t => t.id === trackId);
      if (track && !favoriteTracks.some(ft => ft.id === track.id)) {
        favoriteTracks.push(track);
      }
    }

    return {
      id: 'favorites',
      name: 'Favorites',
      description: 'Your favorite tracks',
      tracks: favoriteTracks,
      isPublic: false,
      type: 'system',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  useEffect(() => {
    const loadFavoritesPlaylist = async () => {
      if (currentPlaylistId === 'favorites') {
        const favoritesPlaylist = await getFavoritesPlaylist();
        // Update the playlist state with the favorites
        if (updatePlaylist) {
          updatePlaylist(favoritesPlaylist);
        }
      }
    };

    loadFavoritesPlaylist();
  }, [currentPlaylistId, favorites, queueTracks, playlists]);

  const renderPlaylistHeader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6">
          {currentPlaylistId === 'favorites' ? 'Favorites' : 
           playlists.find(p => p.id === currentPlaylistId)?.name || 'Playlist'}
          {currentPlaylistId === 'favorites' && loading && (
            <CircularProgress size={16} sx={{ ml: 1 }} />
          )}
        </Typography>
        <IconButton 
          size="small" 
          onClick={(e) => setPlaylistMenu(e.currentTarget)}
        >
          <ArrowDropDownIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Only show delete button for non-favorites playlists */}
        {currentPlaylistId !== 'favorites' && currentPlaylistId !== 'default' && (
          <IconButton
            size="small"
            color="error"
            onClick={handleDeletePlaylist}
            title="Delete playlist"
          >
            <DeleteIcon />
          </IconButton>
        )}
        <IconButton
          onClick={async () => {
            const currentPlaylist = currentPlaylistId === 'favorites' ? 
              await getFavoritesPlaylist() :  // Await the promise
              playlists.find(p => p.id === currentPlaylistId);
            if (currentPlaylist) handleAddPlaylistToQueue(currentPlaylist);
          }}
          title="Add entire playlist to queue"
          size="small"
        >
          <QueueMusicIcon />
        </IconButton>
      </Box>
      {renderPlaylistDropdown()}
    </Box>
  );

  const handleAddPlaylistToQueue = async (playlistToAdd: Playlist) => {
    if (!playlistToAdd.tracks.length) {
      showToast('Playlist is empty', 'info');
      return;
    }
    for (const track of playlistToAdd.tracks) await addToQueue(track);
    showToast('Added playlist to queue', 'success');
  };

  const handleUpdatePlaylistName = async (playlistId: string, newName: string) => {
    try {
      if (!user) return;
      await playlistService.updatePlaylist(user.uid, playlistId, { ...playlists.find(p => p.id === playlistId)!, name: newName });
      await loadPlaylists();
      setEditingPlaylistName(null);
    } catch (error) {
      logger.error('Error updating playlist name:', error);
      showToast('Failed to update playlist name', 'error');
    }
  };

  const renderNewPlaylistDialog = () => (
    <Dialog open={newPlaylistDialog} onClose={() => setNewPlaylistDialog(false)}>
      <DialogTitle>Save Queue as List</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="List Name"
          fullWidth
          value={newPlaylistData.name}
          onChange={(e) => setNewPlaylistData(prev => ({ ...prev, name: e.target.value }))}
          helperText="Enter a name for your new list"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setNewPlaylistDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleSaveQueue}
          disabled={!newPlaylistData.name || queueTracks.length === 0}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  const renderYoutubePlaylistDialog = () => (
    <Dialog open={youtubePlaylistDialog} onClose={() => !importLoading && setYoutubePlaylistDialog(false)}>
      <DialogTitle>
        {queuePlaylistUrl ? 'Import YouTube List to Queue' : 'Import YouTube List to Playlist'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="YouTube List URL"
          fullWidth
          disabled={importLoading}
          value={queuePlaylistUrl ? queuePlaylistUrl : newPlaylistData.youtubeUrl}
          onChange={(e) => {
            if (queuePlaylistUrl !== undefined) {
              setQueuePlaylistUrl(e.target.value);
            } else {
              setNewPlaylistData(prev => ({ ...prev, youtubeUrl: e.target.value }));
            }
          }}
          helperText={`Enter YouTube playlist URL to import to ${queuePlaylistUrl ? 'queue' : 'playlist'}`}
        />
        {importLoading && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Importing {importProgress.current} of {importProgress.total} tracks...
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setYoutubePlaylistDialog(false)} disabled={importLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleImportYoutubePlaylist}
          disabled={importLoading || (!queuePlaylistUrl && !newPlaylistData.youtubeUrl)} // Fixed condition
          startIcon={importLoading ? <CircularProgress size={16} /> : null}
        >
          {importLoading ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const tracks = getTracks();
    const newTracks = Array.from(tracks);
    const [reorderedTrack] = newTracks.splice(result.source.index, 1);
    newTracks.splice(result.destination.index, 0, reorderedTrack);
    const updatedPlaylist = { ...playlist!, tracks: newTracks, updatedAt: Date.now() };
    localStorage.setItem(`playlist_${currentPlaylistId}`, JSON.stringify(updatedPlaylist));
    refreshPlaylist();
  };
  
  const renderPlaylistPanel = () => (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '405px',
        position: 'relative',
        ...(playlistDragDrop.isDragging && {
          '&::after': {
            content: '"Drop YouTube URL or files here"',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'primary.main',
            fontWeight: 'bold',
            zIndex: 2,
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '1rem',
            borderRadius: '4px',
          }
        })
      }}
      onDragOver={playlistDragDrop.handleDragOver}
      onDragLeave={playlistDragDrop.handleDragLeave}
      onDrop={(e) => playlistDragDrop.handleDrop(
        e,
        (files) => {
          const event = { target: { files } } as any;
          addLocalTrackToPlaylist(event);
        },
        handlePlaylistDrop
      )}
    >
      {renderPlaylistHeader()}
      <TableContainer sx={tableContainerSx}>
        <Table size="small" stickyHeader sx={commonTableSx}>
          {renderTableHeader(false)}
          <TableBody>
            {playlist?.tracks?.map((track, index) => renderPlaylistTrackRow(track, index))}
            {(playlist?.tracks?.length || 0) < 5 && renderEmptyRows(5 - (playlist?.tracks?.length || 0))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            label="YouTube URL"
            size="small"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            sx={{ flex: 1, ...textFieldStyles }}
            InputProps={{
              endAdornment: (
                <Button
                  variant="contained"
                  onClick={handlePlaylistUrlSubmit}
                  size="small"
                  sx={addButtonStyles}
                >
                  <AddIcon sx={{ fontSize: '20px' }} />
                </Button>
              ),
            }}
          />
          <Button
            variant="contained"
            component="label"
            startIcon={<InsertDriveFileIcon />}
            color="secondary"
          >
            Add File
            <input
              type="file"
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={addLocalTrackToPlaylist}
              multiple
              hidden
            />
          </Button>
        </Box>
        
        {renderPlaylistButtons()}
      </Box>
    </Paper>
  );

  const renderQueueButtons = () => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        id="queue-yt-playlist-btn"
        variant="outlined"
        fullWidth
        startIcon={<YouTubeIcon />}
        onClick={() => {
          setQueuePlaylistUrl(''); // Clear first
          setNewPlaylistData(prev => ({ ...prev, youtubeUrl: '' }));
          setYoutubePlaylistDialog(true);
        }}
      >
        Import YT List to Queue
      </Button>
      <Button
        id="queue-save-btn"
        variant="outlined"
        fullWidth
        onClick={() => setNewPlaylistDialog(true)}
        startIcon={<SaveIcon />}
      >
        Save Queue
      </Button>
    </Box>
  );

  const renderPlaylistButtons = () => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        id="playlist-yt-playlist-btn"
        variant="outlined"
        fullWidth
        startIcon={<YouTubeIcon />}
        onClick={() => {
          setYoutubePlaylistDialog(true);
          setQueuePlaylistUrl(''); // Clear queue URL
        }}
      >
        Import to Playlist
      </Button>
      <Button
        id="playlist-create-btn"
        variant="outlined"
        fullWidth
        onClick={() => setNewPlaylistDialog(true)}
        startIcon={<SaveIcon />}
      >
        Create Playlist
      </Button>
    </Box>
  );

  const renderPlaylistDropdown = () => (
    <Menu
      anchorEl={playlistMenu}
      open={Boolean(playlistMenu)}
      onClose={() => setPlaylistMenu(null)}
      sx={{ maxHeight: '300px' }}
    >
      <MenuItem 
        onClick={() => {
          setCurrentPlaylistId('favorites');
          setPlaylistMenu(null);
        }}
        selected={currentPlaylistId === 'favorites'}
      >
        <FavoriteIcon sx={{ mr: 1 }} /> Favorites
      </MenuItem>
      {playlists
        .filter(playlist => playlist.id !== 'favorites') // Filter out favorites from regular playlists
        .map((playlist) => (
          <MenuItem
            key={playlist.id}
            onClick={() => {
              setCurrentPlaylistId(playlist.id);
              setPlaylistMenu(null);
            }}
            selected={currentPlaylistId === playlist.id}
          >
            {playlist.name}
          </MenuItem>
        ))}
    </Menu>
  );

  const handleSaveQueue = async () => {
    if (!newPlaylistData.name || !queueTracks?.length) {
      showToast('Please enter a playlist name and ensure queue has tracks', 'error');
      return;
    }
    
    try {
      // Check for duplicate names
      const duplicateName = playlists.some(p => p.name === newPlaylistData.name);
      if (duplicateName) {
        showToast('A playlist with this name already exists', 'error');
        return;
      }

      const newPlaylist = {
        name: newPlaylistData.name,
        description: '',
        tracks: queueTracks,
        isPublic: false,
        type: 'custom' as const,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      let newPlaylistId: string;

      if (user) {
        newPlaylistId = await playlistService.createPlaylist(user.uid, newPlaylist);
      } else {
        newPlaylistId = Date.now().toString();
        const playlistWithId = { ...newPlaylist, id: newPlaylistId };
        const localPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
        
        // Check for duplicate names in local storage
        if (localPlaylists.some((p: Playlist) => p.name === newPlaylistData.name)) {
          showToast('A playlist with this name already exists', 'error');
          return;
        }
        
        localPlaylists.push(playlistWithId);
        localStorage.setItem('playlists', JSON.stringify(localPlaylists));
        setPlaylists(localPlaylists);
      }

      setNewPlaylistDialog(false);
      setNewPlaylistData(prev => ({ ...prev, name: '' }));
      showToast('Queue saved as playlist successfully', 'success');
      
      // Switch to the newly created playlist
      setCurrentPlaylistId(newPlaylistId);
      await loadPlaylists();
      
    } catch (error) {
      logger.error('Error saving queue:', error);
      showToast(error.message || 'Error saving queue', 'error');
    }
  };

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', handlePlayPause);
      navigator.mediaSession.setActionHandler('pause', handlePlayPause);
      navigator.mediaSession.setActionHandler('previoustrack', handlePreviousTrack);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
      navigator.mediaSession.setActionHandler('seekbackward', () => seek(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => seek(10));
    }
  }, []);

  const updateMediaSessionMetadata = (track: Track) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: 'Pro Muslim App',
        album: track.type === 'youtube' ? 'YouTube' : 'Local Audio',
        artwork: [
          {
            src: track.thumbnail || '/icon-192x192.png', // Fallback to app icon
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: track.thumbnail || '/icon-512x512.png', // Fallback to app icon
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });
    }
  };

  const handleTrackNameClick = async (index: number) => {
    const track = queueTracks[index];
    if (!track) return;
    
    try {
      setCurrentTrackIndex(index);
      setCurrentTime(0);
      setSliderValue(0);
      await handlePlayTrack(track);
    } catch (error) {
      logger.error('Error playing track:', error);
      showToast('Error playing track', 'error');
      
      // If local file not found, try next track
      if (track.type === 'local') {
        handleNextTrack();
      }
    }
  };

  // Add handler to create favorites playlist if it doesn't exist
  const initializeFavoritesPlaylist = async () => {
    if (!user) return;
    
    try {
      let favoritesPlaylist = await playlistService.getPlaylist(user.uid, 'favorites');
      
      if (!favoritesPlaylist) {
        // Create new favorites playlist if it doesn't exist
        const favoritesId = await playlistService.createPlaylist(user.uid, {
          name: 'Favorites',
          description: 'Your favorite tracks',
          tracks: [],
          isPublic: false,
          type: 'system',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        favoritesPlaylist = await playlistService.getPlaylist(user.uid, favoritesId);
      }

      // Load favorites from user document
      const userRef = doc(db, `users/${user.uid}`);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFavorites(userData.favorites || []);
      }
    } catch (error) {
      logger.error('Error initializing favorites playlist:', error);
    }
  };

  // Update effect to initialize favorites playlist
  useEffect(() => {
    if (user) {
      initializeFavoritesPlaylist().then(() => {
        // Explicitly load favorites playlist after initialization
        if (currentPlaylistId === 'favorites') {
          refreshPlaylist();
        }
      });
    }
  }, [user]);

  const handleDeletePlaylist = async () => {
    if (currentPlaylistId === 'favorites' || currentPlaylistId === 'default') return;
    
    const playlistToDelete = playlists.find(p => p.id === currentPlaylistId);
    if (!playlistToDelete) return;

    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        if (user) {
          // Delete from Firebase
          await playlistService.deletePlaylist(user.uid, currentPlaylistId);
        } else {
          // Delete from local storage
          const localPlaylists = playlists.filter(p => p.id !== currentPlaylistId);
          localStorage.setItem('playlists', JSON.stringify(localPlaylists));
          setPlaylists(localPlaylists);
        }
  
        showToast('Playlist deleted successfully', 'success');
        setCurrentPlaylistId('default');
        await loadPlaylists();
      } catch (error) {
        logger.error('Error deleting playlist:', error);
        showToast('Error deleting playlist', 'error');
      }
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange({} as Event, Math.min(volume + 5, 100));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange({} as Event, Math.max(volume - 5, 0));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [volume]);

  const handleTrackEnd = () => {
    switch (repeatMode) {
      case 'one':
        // Restart current track
        if (youtubeRef.current?.internalPlayer) {
          youtubeRef.current.internalPlayer.seekTo(0);
          youtubeRef.current.internalPlayer.playVideo();
        } else if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
        break;
      case 'all':
        // Play next track or go back to start of queue
        if (currentTrackIndex === queueTracks.length - 1) {
          handleTrackSelection(0);
        } else {
          handleNextTrack();
        }
        break;
      default:
        // Stop if it's the last track, otherwise play next
        if (currentTrackIndex === queueTracks.length - 1) {
          setIsPlaying(false);
        } else {
          handleNextTrack();
        }
    }
  };

  const handleShuffleToggle = () => {
    setIsShuffled(!isShuffled);
    if (!isShuffled && queueTracks?.length > 0) {
      // Shuffle the queue
      const shuffledTracks = [...queueTracks].sort(() => Math.random() - 0.5);
      const currentTrack = queueTracks[currentTrackIndex];
      if (currentTrack) {
        const newCurrentIndex = shuffledTracks.findIndex(t => t.id === currentTrack.id);
        if (newCurrentIndex !== -1) {
          [shuffledTracks[currentTrackIndex], shuffledTracks[newCurrentIndex]] = 
          [shuffledTracks[newCurrentIndex], shuffledTracks[currentTrackIndex]];
        }
        setQueueTracks(shuffledTracks);
      }
    } else {
      // Restore original order
      loadQueueTracks().then(tracks => {
        if (tracks?.length > 0) {
          setQueueTracks(tracks);
        }
      });
    }
  };

  // Optimize scroll event handler
  const handleScroll = useCallback(debounce((e: Event) => {
    // scroll handling logic
  }, 100), []);

  // Add passive event listeners
  useEffect(() => {
    const options = { passive: true };
    window.addEventListener('scroll', handleScroll, options);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Optimize table rendering with virtualization
  const renderVirtualizedList = ({ index, style }: any) => {
    const track = queueTracks[index];
    return (
      <div style={style}>
        {renderQueueTrackRow(track, index)}
      </div>
    );
  };

  // Update table container to use virtualization
  const renderQueueList = () => (
    <List
      height={275}
      itemCount={queueTracks.length}
      itemSize={36}
      width="100%"
    >
      {renderVirtualizedList}
    </List>
  );

  if (isMinimized) {
    return (
      <MiniPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={handlePlayPause}
        onMaximize={() => setIsMinimized(false)}
        onSeek={(value) => {
          setCurrentTime(value);
          if (audioRef.current) {
            audioRef.current.currentTime = value;
          }
        }}
      />
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {youtubeVideoId ? renderYoutubePlayer() : (
        <audio
          ref={audioRef}
          src={getCurrentTrack()?.url || ''}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={handleNextTrack}
        />
      )}
  
      {renderMainContent()}
  
      <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' }, // Stack on mobile, row on desktop
        gap: 2,
        '& > *': {
          flex: { xs: '1 1 100%', md: '1 1 50%' } // Full width on mobile, half on desktop
        }
      }}>
        {renderQueuePanel()}
        {renderPlaylistPanel()}
      </Box>
  
      {renderNewPlaylistDialog()}
      {renderYoutubePlaylistDialog()}
    </Box>
  );
};

export default AudioPlayer;