import React, { useState, useRef, useEffect } from 'react';
import {
  Box, IconButton, Slider, Typography, TextField, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Grid, useTheme, Select, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Menu
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

const SUPPORTED_FORMATS = [
  'audio/*', 'video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska', 'video/quicktime',
  'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv'
];

const AudioPlayer: React.FC = () => {
  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | undefined>(undefined);
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [newPlaylistDialog, setNewPlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [youtubePlaylistDialog, setYoutubePlaylistDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubeRef = useRef<any>(null);
  const { user } = useAuth();
  const theme = useTheme();
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string>('default');
  const { playlist, loading, error, addTrack, removeTrack, updateTrack, refreshPlaylist } = usePlaylist(currentPlaylistId);
  const { queueTracks, addToQueue, removeFromQueue, clearQueue } = useQueue();
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

  const youtubeOpts = {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0, controls: 0, origin: window.location.origin, enablejsapi: 1, modestbranding: 1,
      rel: 0, showinfo: 0, fs: 0, playsinline: 1, disablekb: 1, iv_load_policy: 3, autohide: 1,
      vq: 'tiny', html5: 1, cc_load_policy: 0, color: 'white', hl: 'en',
      host: window.location.protocol + '//' + window.location.hostname,
      widget_referrer: window.location.origin,
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
        console.error('Error loading playlists:', error);
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
        console.error('Error creating playlist:', error);
        showToast('Error creating playlist', 'error');
      }
    }
  };

  const handleAddTrackToQueue = async (track: Track) => {
    try {
      await addToQueue(track);
      showToast('Added to queue', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error adding to queue', 'error');
    }
  };

  const handleAddTrack = async () => {
    const urlToAdd = queuePlaylistUrl || playlistUrl || newTrackUrl;
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
          type: 'youtube'
        };

        if (queuePlaylistUrl) {
          await addToQueue(newTrack);
          setQueuePlaylistUrl('');
        } else {
          await addTrack(newTrack);
          setPlaylistUrl('');
        }
        setNewTrackUrl('');
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
            localStorage.setItem('favorites', JSON.stringify(userData.favorites || []));
          }
        } catch (error) {
          console.error('Error loading favorites:', error);
          showToast('Error loading favorites', 'error');
        }
      } else {
        const localFavorites = localStorage.getItem('favorites');
        if (localFavorites) setFavorites(JSON.parse(localFavorites));
      }
    };
    loadFavorites();
  }, [user]);

  const toggleFavorite = async (trackId: string) => {
    try {
      const isFavorite = favorites.includes(trackId);
      const newFavorites = isFavorite ? favorites.filter(id => id !== trackId) : [...favorites, trackId];
      setFavorites(newFavorites);
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      if (user) {
        await playlistService.toggleFavorite(user.uid, trackId, !isFavorite);
      }
      showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success');
      if (currentPlaylistId === 'favorites' && isFavorite) await removeTrack(trackId);
      if (currentPlaylistId === 'favorites') refreshPlaylist();
    } catch (error) {
      console.error('Error toggling favorite:', error);
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
      } else {
        if (audioRef.current) {
          if (isPlaying) audioRef.current.pause();
          else await audioRef.current.play();
          setIsPlaying(!isPlaying);
        }
      }
    } catch (error) {
      console.error('Error in handlePlayPause:', error);
      showToast('Error playing track', 'error');
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      setSliderValue(time);
      setDuration(audioRef.current.duration || 0);
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
            console.error('Error updating YouTube time:', error);
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
      console.error('Error seeking:', error);
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
    
    try {
      const successfulTracks: Track[] = [];
      const failedTracks: string[] = [];

      for (const file of files) {
        try {
          const metadata = await getAudioMetadata(file);
          let fileUrl: string;
          
          if (file.type.startsWith('video/')) {
            fileUrl = await extractAudioFromVideo(file);
          } else {
            fileUrl = URL.createObjectURL(file);
          }

          const newTrack: Track = {
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: fileUrl,
            name: metadata.name || file.name,
            duration: metadata.duration,
            thumbnail: '',
            addedAt: Date.now(),
            type: 'local' as const,
            metadata: {
              lastModified: metadata.lastModified,
              size: metadata.size,
              mimeType: file.type
            }
          };

          await addTrack(newTrack).catch(() => {
            failedTracks.push(file.name);
            if (fileUrl) URL.revokeObjectURL(fileUrl);
          });

          if (!failedTracks.includes(file.name)) {
            successfulTracks.push(newTrack);
          }
        } catch (error) {
          failedTracks.push(file.name);
        }
      }

      if (successfulTracks.length > 0) {
        showToast(`Added ${successfulTracks.length} track(s) successfully`, 'success');
      }
      
      if (failedTracks.length > 0) {
        showToast(`${failedTracks.length} track(s) were skipped (already exist or invalid)`, 'info');
      }
    } catch (error) {
      showToast('Error adding tracks', 'error');
    }
  };

  const handlePlayTrack = async (track: Track) => {
    try {
      if (track.type === 'youtube') {
        const videoId = validateYouTubeUrl(track.url);
        if (videoId) {
          setYoutubeVideoId(videoId);
          setDuration(track.duration);
          if (audioRef.current) audioRef.current.src = '';
          if (youtubeRef.current?.internalPlayer) {
            await youtubeRef.current.internalPlayer.loadVideoById({ videoId, startSeconds: 0, suggestedQuality: 'tiny' });
            youtubeRef.current.internalPlayer.setPlaybackQuality('tiny');
            setIsPlaying(true);
          }
        }
      } else if (track.type === 'local') {
        setYoutubeVideoId(undefined);
        if (audioRef.current) {
          audioRef.current.src = track.url;
          await audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error playing track:', error);
      showToast('Error playing track', 'error');
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const track = playlist?.tracks.find(t => t.id === trackId);
      if (track?.type === 'local') URL.revokeObjectURL(track.url);
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
      console.error('Error removing track:', error);
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
      console.error('Error selecting track:', error);
      showToast('Error playing track', 'error');
    }
  };

  const handleYoutubeStateChange = (event: any) => {
    switch (event.data) {
      case YouTube.PlayerState.ENDED:
        handleNextTrack();
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
          console.error('Error updating YouTube time:', error);
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
              console.error('Error auto-playing:', error);
            }
          }
        }}
        onError={(error) => {
          console.error('YouTube player error:', error);
          showToast('Error playing YouTube track', 'error');
        }}
        opts={youtubeOpts}
      />
    </Box>
  );

  const handleImportYoutubePlaylist = async () => {
    try {
      setImportLoading(true);
      const playlistId = extractYoutubePlaylistId(newPlaylistData.youtubeUrl);
      if (!playlistId) {
        showToast('Invalid YouTube playlist URL', 'error');
        return;
      }
      if (user) {
        const details = await playlistService.fetchYouTubePlaylistDetails(playlistId);
        setImportProgress({ current: 0, total: details.itemCount });
        const newPlaylistId = await playlistService.importYouTubePlaylist(
          user.uid, playlistId, undefined, (current) => setImportProgress(prev => ({ ...prev, current }))
        );
        showToast(`YouTube playlist "${details.title}" imported successfully`, 'success');
        setYoutubePlaylistDialog(false);
        setNewPlaylistData(prev => ({ ...prev, youtubeUrl: '' }));
        await loadPlaylists();
        setCurrentPlaylistId(newPlaylistId);
        refreshPlaylist();
      }
    } catch (error: any) {
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
        key={`empty-${index}`}
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

  const getTracks = () => queueTracks;
  const getCurrentTrack = () => getTracks()[currentTrackIndex] || null;

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

  const renderMainContent = () => (
    <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
      {getCurrentTrack()?.thumbnail && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <img
            src={getCurrentTrack().thumbnail}
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
        />
      </Box>

      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <SpeedControls onSpeedChange={changePlaybackRate} />
      </Box>
    </Paper>
  );

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
    <Draggable key={track.id} draggableId={track.id} index={index}>
      {(provided) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
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
              <IconButton size="small" onClick={() => handleTrackSelection(index)}>
                {index === currentTrackIndex && isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
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
    if (!queuePlaylistUrl) return;
    
    try {
      // Check if it's a playlist URL
      const playlistId = extractYoutubePlaylistId(queuePlaylistUrl);
      if (playlistId) {
        // Import playlist directly to queue
        const details = await playlistService.fetchYouTubePlaylistDetails(playlistId);
        setImportProgress({ current: 0, total: details.itemCount });
        const tracks = await playlistService.fetchYouTubePlaylistTracks(playlistId);
        for (const track of tracks) {
          await addToQueue(track); // Add each track to queue
        }
        showToast('Playlist imported to queue successfully', 'success');
      } else {
        // Try adding as single track
        await handleAddTrack();
      }
      setQueuePlaylistUrl('');
    } catch (error) {
      showToast('Error processing URL', 'error');
    }
  };

  const renderQueuePanel = () => (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '405px' }}>
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
            Playlist
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

  const renderPlaylistTrackRow = (track: Track, index: number) => (
    <TableRow
      key={track.id}
      sx={{
        backgroundColor: index % 2 === 0 ? 'grey.50' : 'inherit', '&:hover': { backgroundColor: 'action.hover' },
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
          <IconButton size="small" onClick={() => handleAddTrackToQueue(track)}>
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

  const renderPlaylistHeader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">{playlists.find(p => p.id === currentPlaylistId)?.name || 'Playlist'}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton
          onClick={() => {
            const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);
            if (currentPlaylist) handleAddPlaylistToQueue(currentPlaylist);
          }}
          title="Add entire playlist to queue"
        >
          <QueueMusicIcon />
        </IconButton>
        <IconButton onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}>
          {showPlaylistDropdown ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
        </IconButton>
      </Box>
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
      console.error('Error updating playlist name:', error);
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
      <DialogTitle>Import YouTube List</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="YouTube List URL"
          fullWidth
          disabled={importLoading}
          value={newPlaylistData.youtubeUrl}
          onChange={(e) => setNewPlaylistData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
          helperText="Enter the full YouTube list URL"
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
          disabled={importLoading || !newPlaylistData.youtubeUrl}
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
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '405px' }}>
      {renderPlaylistHeader()}
      <TableContainer sx={tableContainerSx}>
        <Table size="small" stickyHeader sx={commonTableSx}>
          {renderTableHeader(false)}
          <TableBody>
            {getTracks().map((track, index) => renderPlaylistTrackRow(track, index))}
            {getTracks().length < 5 && renderEmptyRows(5 - getTracks().length)}
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
                  onClick={handleAddTrack}
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
        
        {renderQueueButtons()}
      </Box>
    </Paper>
  );

  const renderQueueButtons = () => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<YouTubeIcon />}
        onClick={() => setYoutubePlaylistDialog(true)}
      >
        Playlist
      </Button>
      <Button
        variant="outlined"
        fullWidth
        onClick={() => setNewPlaylistDialog(true)}
        startIcon={<SaveIcon />}
      >
        Playlist
      </Button>
    </Box>
  );

  const handleSaveQueue = async () => {
    if (user && newPlaylistData.name && queueTracks.length > 0) {
      try {
        const newPlaylistId = await playlistService.createPlaylist(user.uid, {
          name: newPlaylistData.name,
          description: '',
          tracks: queueTracks,
          isPublic: false,
          type: 'custom',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        setNewPlaylistDialog(false);
        setNewPlaylistData(prev => ({ ...prev, name: '' }));
        showToast('Queue saved as playlist successfully', 'success');
        await loadPlaylists();
      } catch (error) {
        console.error('Error saving queue:', error);
        showToast('Error saving queue', 'error');
      }
    }
  };

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