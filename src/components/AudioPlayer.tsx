import React, { useState, useRef, useEffect } from 'react';
import {
  Box, IconButton, Slider, Typography, TextField, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Grid, useMediaQuery, useTheme, Select, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress
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
import ClearAllIcon from '@mui/icons-material/ClearAll'; // Add this import

// Supported formats for file input
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
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
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

  // YouTube player options
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

  // Add this new style object near the top with other style definitions
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

  // Load playlists
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

  // Create new playlist
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

  // Add track to queue
  const handleAddTrackToQueue = async (track: Track) => {
    try {
      await addToQueue(track);
      showToast('Added to queue', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error adding to queue', 'error');
    }
  };

  // Update handleAddTrack to handle URL from different sources
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

        // Add to queue or playlist based on which URL was used
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

  // Load favorites
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

  // Toggle favorite
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

  // Play/Pause handler
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

  // Time update for audio
  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      setSliderValue(time);
      setDuration(audioRef.current.duration || 0);
    }
  };

  // Seek handler
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

  // YouTube time update
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

  // Next/Previous track
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

  // Format time
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Seek by seconds
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

  // Change playback rate
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

  // Extract audio from video
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

  // Add local track
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

  // Play track
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

  // Remove track
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

  // Track selection
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

  // YouTube state change
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

  // Cleanup
  useEffect(() => {
    return () => {
      stopYoutubeTimeUpdate();
      if (youtubeRef.current?.internalPlayer) youtubeRef.current.internalPlayer.stopVideo();
    };
  }, []);

  // Render YouTube player
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

  // Import YouTube playlist
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
    cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    maxWidth: { xs: '150px', sm: '250px' }, width: { xs: '150px', sm: '250px' }, display: 'flex', // Changed from 'block' to 'inline-block'
    alignItems: 'center', // Added to align text vertically
    height: '40px'      // Added to ensure consistent height
  };

  const renderEmptyRows = (count: number) => (
    Array.from({ length: count }).map((_, index) => (
      <TableRow 
        key={`empty-${index}`}
        sx={{
          height: '40px !important', // Force height with !important
          '& td': { 
            height: '40px !important', // Force height with !important
            borderBottom: '1px solid',
            borderColor: 'divider',
            // Remove bottom border for last row
            ...(index === count - 1 && {
              borderBottom: 'none'
            })
          }
        }}
      >
        <TableCell 
          colSpan={isSmallScreen ? 4 : 5} 
          sx={{ p: 0.75 }} // Match the padding of regular cells
        />
      </TableRow>
    ))
  );

  const tableContainerStyles = {
    flex: 1,
    maxHeight: '270px', // Change from height to maxHeight
    overflow: 'hidden', // Change from 'auto' to 'hidden'
    borderBottom: 1,
    borderColor: 'divider',
    '& .MuiTableCell-root': {
      py: 0.75,
      height: '30px', // Change row height to 30px
      lineHeight: '30px', // Add this to align text vertically
      '& > *': {
        verticalAlign: 'middle', // Add this to align icons with text
      }
    },
    '& .MuiTableRow-root': {
      height: '30px', // Change row height to 30px
    },
    '& .MuiTableCell-head': {
      height: '30px', // Change heading height to 30px
      backgroundColor: 'background.paper',
      fontWeight: 'bold'
    }
  };

  const QUEUE_EMPTY_ROWS = 5;    // Changed from 6 to 5
  const PLAYLIST_EMPTY_ROWS = 4; // Changed from 5 to 4

  // Render functions
  const getTracks = () => playlist?.tracks || [];
  const getCurrentTrack = () => getTracks()[currentTrackIndex] || null;

  const renderMainContent = () => (
    <Paper elevation={3} sx={{ p: { xs: 1, sm: 2 }, mb: 2, bgcolor: 'background.paper' }}>
      {getCurrentTrack()?.thumbnail && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <img
            src={getCurrentTrack().thumbnail}
            alt="Track Thumbnail"
            style={{
              width: isSmallScreen ? '100px' : '150px', height: isSmallScreen ? '100px' : '150px',
              borderRadius: '12px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', objectFit: 'cover',
            }}
          />
        </Box>
      )}
      {renderMainTitle()}
      <Box sx={{ px: { xs: 1, sm: 2 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 1 }}>
        <Typography sx={{ color: 'text.secondary' }}>{formatTime(currentTime)}</Typography>
        <Slider
          value={sliderValue}
          max={duration || 100}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderChangeCommitted}
          sx={{
            flex: 1, color: 'primary.main',
            '& .MuiSlider-thumb': { width: 12, height: 12, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' },
            '& .MuiSlider-track': { height: 4 }, '& .MuiSlider-rail': { height: 4, opacity: 0.3 },
          }}
        />
        <Typography sx={{ color: 'text.secondary' }}>{formatTime(duration)}</Typography>
      </Box>
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNextTrack}
        onPrevious={handlePreviousTrack}
        onSeek={seek}
      />
      <SpeedControls onSpeedChange={changePlaybackRate} />
    </Paper>
  );

  const renderMainTitle = () => (
    <Box sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px' }}>
      <Typography
        variant={isSmallScreen ? 'h6' : 'h5'}
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
            height: '40px'
          }}
        >
          <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
            {track.type === 'youtube' ? <LanguageIcon /> : <InsertDriveFileIcon />}
          </TableCell>
          {!isSmallScreen && (
            <TableCell sx={{ textAlign: 'center' }}>
              {index + 1}
            </TableCell>
          )}
          <TableCell onClick={() => handleTrackSelection(index)} sx={cellStyles}>
            {track.name}
          </TableCell>
          <TableCell sx={{ textAlign: 'center' }}>
            {formatDuration(track.duration)}
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => handleTrackSelection(index)}
              >
                {index === currentTrackIndex && isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => removeFromQueue(track.id)}
              >
                <DeleteIcon />
              </IconButton>
              <Box {...provided.dragHandleProps} sx={{ display: 'flex', cursor: 'grab' }}>
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
    "& .MuiTableCell-root": {
      borderBottom: "1px solid",
      borderColor: "divider",
    },
    "& .MuiTableRow-root:last-child .MuiTableCell-root": {
      borderBottom: "none"
    },
    width: "100%",
    tableLayout: "fixed"
  };

  const renderQueuePanel = () => (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderQueueHeader()}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={tableContainerStyles}>
          <DragDropContext onDragEnd={(result) => {
            if (!result.destination) return;
            const newTracks = Array.from(queueTracks);
            const [reorderedItem] = newTracks.splice(result.source.index, 1);
            newTracks.splice(result.destination.index, 0, reorderedItem);
            // Update queue
            clearQueue();
            newTracks.forEach(track => addToQueue(track));
          }}>
            <Droppable droppableId="queue">
              {(provided) => (
                <Table size="small" stickyHeader sx={tableStyles}>
                  <TableHead>
                    <TableRow>
                      <TableCell width="10%" sx={{ p: { xs: 0.5, sm: 1 } }}></TableCell>
                      {!isSmallScreen && <TableCell width="10%" sx={{ p: { xs: 0.5, sm: 1 } }}>#</TableCell>}
                      <TableCell width="45%" sx={{ p: { xs: 0.5, sm: 1 } }}>Name</TableCell>
                      <TableCell width="15%" sx={{ p: { xs: 0.5, sm: 1 } }}>Length</TableCell>
                      <TableCell width="20%" align="center" sx={{ p: { xs: 0.5, sm: 1 } }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
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
        
        {/* Modified Add Track Controls */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
                    onClick={handleAddTrack}
                    size="small"
                    sx={addButtonStyles}
                  >
                    <YouTubeIcon sx={{ fontSize: '20px' }} />
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
        {track.type === 'youtube' ? <LanguageIcon /> : <InsertDriveFileIcon />}
      </TableCell>
      {!isSmallScreen && <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>{index + 1}</TableCell>}
      <TableCell sx={{ ...cellStyles, py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>{track.name}</TableCell>
      <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 }, typography: 'body2' }}>{formatDuration(track.duration)}</TableCell>
      <TableCell sx={{ py: 1, px: { xs: 0.5, sm: 1 } }}>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <IconButton size={isSmallScreen ? 'small' : 'medium'} onClick={() => handleAddTrackToQueue(track)} title="Add to queue">
            <QueueMusicIcon />
          </IconButton>
          <IconButton
            size={isSmallScreen ? 'small' : 'medium'}
            onClick={() => {
              const newName = prompt('Edit track name:', track.name);
              if (newName && newName !== track.name) updateTrack(track.id, { name: newName });
            }}
            title="Edit name"
          >
            <EditIcon />
          </IconButton>
          <IconButton size={isSmallScreen ? 'small' : 'medium'} onClick={() => handleRemoveTrack(track.id)} title="Remove from playlist">
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
      <DialogTitle>Create New Playlist</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Playlist Name"
          fullWidth
          value={newPlaylistData.name}
          onChange={(e) => setNewPlaylistData(prev => ({ ...prev, name: e.target.value }))}
          helperText="Enter a name for your new playlist"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setNewPlaylistDialog(false)}>Cancel</Button>
        <Button onClick={handleCreatePlaylist}>Create</Button>
      </DialogActions>
    </Dialog>
  );
  
  const renderYoutubePlaylistDialog = () => (
    <Dialog open={youtubePlaylistDialog} onClose={() => !importLoading && setYoutubePlaylistDialog(false)}>
      <DialogTitle>Import YouTube Playlist</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="YouTube Playlist URL"
          fullWidth
          disabled={importLoading}
          value={newPlaylistData.youtubeUrl}
          onChange={(e) => setNewPlaylistData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
          helperText="Enter the full YouTube playlist URL"
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
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderPlaylistHeader()}
      {showPlaylistDropdown && (
        <Box sx={{ 
          mb: 2, 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1,
          p: 1,
          maxHeight: '30vh',
          overflowY: 'auto'
        }}>
          {playlists.map((p) => (
            <Box
              key={p.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
                ...(p.id === currentPlaylistId && {
                  bgcolor: 'action.selected'
                })
              }}
              onClick={() => {
                setCurrentPlaylistId(p.id);
                setShowPlaylistDropdown(false);
              }}
            >
              <Typography>{p.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {p.tracks.length} tracks
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={tableContainerStyles}>
          <Table size="small" stickyHeader sx={tableStyles}>
            <TableHead>
              <TableRow>
                <TableCell width="10%" sx={{ p: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'table-cell' } }}></TableCell>
                {!isSmallScreen && <TableCell width="10%" sx={{ p: { xs: 0.5, sm: 1 } }}>#</TableCell>}
                <TableCell width="45%" sx={{ p: { xs: 0.5, sm: 1 } }}>Name</TableCell>
                <TableCell width="15%" sx={{ p: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'table-cell' } }}>Length</TableCell>
                <TableCell width="20%" align="center" sx={{ p: { xs: 0.5, sm: 1 } }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getTracks().map((track, index) => renderPlaylistTrackRow(track, index))}
              {getTracks().length < 4 && renderEmptyRows(4 - getTracks().length)}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Modified Add Track Controls */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
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
                    sx={addButtonStyles}
                  >
                    <YouTubeIcon sx={{ fontSize: '20px' }} />
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
          
          {/* Playlist Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<YouTubeIcon />}
              onClick={() => setYoutubePlaylistDialog(true)}
            >
              Import Playlist
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PlaylistAddIcon />}
              onClick={() => setNewPlaylistDialog(true)}
            >
              New Playlist
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Audio/YouTube Players */}
      {youtubeVideoId ? renderYoutubePlayer() : (
        <audio
          ref={audioRef}
          src={getCurrentTrack()?.url || ''}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={handleNextTrack}
        />
      )}
  
      {/* Main content - Player controls */}
      {renderMainContent()}
  
      {/* Lists Container */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2
      }}>
        {renderQueuePanel()}
        {renderPlaylistPanel()}
      </Box>
  
      {/* Dialogs */}
      {renderNewPlaylistDialog()}
      {renderYoutubePlaylistDialog()}
    </Box>
  );
};
  
export default AudioPlayer;