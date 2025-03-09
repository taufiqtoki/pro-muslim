import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Slider, Typography, TextField, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, useMediaQuery, useTheme, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
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
    const [currentPlaylistId, setCurrentPlaylistId] = useState<string>('queue');
    const { playlist, loading, error, addTrack, removeTrack, updateTrack, refreshPlaylist } = usePlaylist(currentPlaylistId);

    // Add state for YouTube duration
    const [youtubeDuration, setYoutubeDuration] = useState(0);

    // Fix for Slider state management
    const [sliderValue, setSliderValue] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Add new ref for interval cleanup
    const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Add new YouTube optimization options
    const youtubeOpts = {
        height: '1',
        width: '1',
        playerVars: {
            autoplay: 0,
            controls: 0,
            origin: window.location.origin,
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            playsinline: 1,
            disablekb: 1,
            iv_load_policy: 3,
            autohide: 1,
            vq: 'tiny', // Lowest video quality since we only need audio
            html5: 1,
            cc_load_policy: 0, // Disable closed captions
            color: 'white', // Simpler color scheme
            hl: 'en', // Force English UI for smaller size
            host: window.location.protocol + '//' + window.location.hostname,
            widget_referrer: window.location.origin,
        },
    };

    const [newPlaylistData, setNewPlaylistData] = useState({
        name: '',
        type: 'custom' as const,
        youtubeUrl: ''
    });

    const [importLoading, setImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    const [playlists, setPlaylists] = useState<Playlist[]>([]); // Add state for playlists

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
            // Load from localStorage if no user
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
                    name: newPlaylistData.name,
                    description: '',
                    tracks: [],
                    isPublic: false,
                    type: 'custom',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                setNewPlaylistDialog(false);
                setNewPlaylistData(prev => ({ ...prev, name: '' }));
                showToast('Playlist created successfully', 'success');
                await loadPlaylists(); // Reload playlists to update dropdown
                setCurrentPlaylistId(newPlaylistId); // Switch to the new playlist
            } catch (error) {
                console.error('Error creating playlist:', error);
                showToast('Error creating playlist', 'error');
            }
        }
    };

    const handleAddTrack = async () => {
        if (!newTrackUrl) return;
        
        try {
            const videoId = validateYouTubeUrl(newTrackUrl);
            if (!videoId) {
                showToast('Invalid YouTube URL', 'error');
                return;
            }

            const trackData = await getVideoDetails(videoId);
            if (trackData) {
                const newTrack: Track = {
                    id: Date.now().toString(),
                    url: newTrackUrl,
                    name: trackData.name,
                    duration: trackData.duration,
                    thumbnail: trackData.thumbnail,
                    addedAt: Date.now(),
                    type: 'youtube'
                };
                
                await addTrack(newTrack);
                showToast('Track added successfully', 'success');
                setNewTrackUrl('');
            }
        } catch (error) {
            showToast('Error adding track', 'error');
            console.error('Error adding track:', error);
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
                        // Sync with localStorage
                        localStorage.setItem('favorites', JSON.stringify(userData.favorites || []));
                    }
                } catch (error) {
                    console.error('Error loading favorites:', error);
                    showToast('Error loading favorites', 'error');
                }
            } else {
                // Load from localStorage if no user
                const localFavorites = localStorage.getItem('favorites');
                if (localFavorites) {
                    setFavorites(JSON.parse(localFavorites));
                }
            }
        };

        loadFavorites();
    }, [user]);

    const toggleFavorite = async (trackId: string) => {
        try {
            const isFavorite = favorites.includes(trackId);
            const newFavorites = isFavorite 
                ? favorites.filter(id => id !== trackId)
                : [...favorites, trackId];

            // Update local state immediately
            setFavorites(newFavorites);
            
            // Save to localStorage
            localStorage.setItem('favorites', JSON.stringify(newFavorites));

            // If user is logged in, sync with Firestore
            if (user) {
                try {
                    await playlistService.toggleFavorite(user.uid, trackId, !isFavorite);
                } catch (error) {
                    // Revert local state if Firestore update fails
                    setFavorites(favorites);
                    localStorage.setItem('favorites', JSON.stringify(favorites));
                    throw error;
                }
            }

            showToast(
                isFavorite ? 'Removed from favorites' : 'Added to favorites',
                'success'
            );

            // If we're in favorites playlist and removing from favorites,
            // remove the track from the current view
            if (currentPlaylistId === 'favorites' && isFavorite) {
                await removeTrack(trackId);
            }

            // Refresh the playlist if we're in favorites view
            if (currentPlaylistId === 'favorites') {
                refreshPlaylist();
            }

        } catch (error) {
            console.error('Error toggling favorite:', error);
            showToast('Error updating favorites', 'error');
        }
    };

    const renderPlaylistSelector = () => (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Select
                value={currentPlaylistId}
                onChange={(e) => setCurrentPlaylistId(e.target.value)}
                sx={{ minWidth: 200 }}
            >
                {playlists.map((playlist) => (
                    <MenuItem key={playlist.id} value={playlist.id}>
                        {playlist.name}
                    </MenuItem>
                ))}
            </Select>
            <Button
                startIcon={<PlaylistAddIcon />}
                onClick={() => setNewPlaylistDialog(true)}
            >
                New Playlist
            </Button>
            <Button
                startIcon={<YouTubeIcon />}
                onClick={() => setYoutubePlaylistDialog(true)}
            >
                Import YouTube Playlist
            </Button>
        </Box>
    );

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
                    onChange={(e) => setNewPlaylistData(prev => ({...prev, name: e.target.value}))}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setNewPlaylistDialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePlaylist}>Create</Button>
            </DialogActions>
        </Dialog>
    );

    const renderYoutubePlaylistDialog = () => (
        <Dialog 
            open={youtubePlaylistDialog} 
            onClose={() => !importLoading && setYoutubePlaylistDialog(false)}
        >
            <DialogTitle>Import YouTube Playlist</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="YouTube Playlist URL"
                    fullWidth
                    disabled={importLoading}
                    value={newPlaylistData.youtubeUrl}
                    onChange={(e) => setNewPlaylistData(prev => ({...prev, youtubeUrl: e.target.value}))}
                    helperText="Enter the full YouTube playlist URL"
                />
                {importLoading && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        <Typography variant="body2" color="textSecondary">
                            Importing {importProgress.current} of {importProgress.total} tracks...
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={() => setYoutubePlaylistDialog(false)}
                    disabled={importLoading}
                >
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

    const renderTrackRow = (track: Track, index: number) => (
        <TableRow
            key={track.id}
            sx={{
                backgroundColor: index === currentTrackIndex ? 'action.selected' : 'inherit',
                cursor: 'pointer',
                '&:hover': {
                    backgroundColor: 'action.hover',
                },
            }}
        >
            <TableCell>{track.type === 'youtube' ? <LanguageIcon /> : <InsertDriveFileIcon />}</TableCell>
            {!isSmallScreen && <TableCell>{index + 1}</TableCell>}
            <TableCell 
                onClick={() => handleTrackSelection(index)}
                sx={{ cursor: 'pointer' }}
            >
                {track.name || ''}
            </TableCell>
            <TableCell>{formatDuration(track.duration)}</TableCell>
            <TableCell>
                <Box 
                    display="flex" 
                    flexDirection={isSmallScreen ? 'column' : 'row'}
                    gap={1}
                    sx={{ minWidth: isSmallScreen ? 'auto' : '200px' }}
                >
                    <IconButton 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (index === currentTrackIndex) {
                                handlePlayPause();
                            } else {
                                handleTrackSelection(index);
                            }
                        }}
                        sx={{ 
                            padding: '12px',
                            '@media (max-width: 600px)': {
                                padding: '8px',
                            }
                        }}
                    >
                        {index === currentTrackIndex && isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                    <IconButton 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track.id);
                        }}
                        sx={{ 
                            padding: '12px',
                            '@media (max-width: 600px)': {
                                padding: '8px',
                            }
                        }}
                    >
                        {favorites.includes(track.id) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                    </IconButton>
                    <IconButton 
                        onClick={(e) => {
                            e.stopPropagation();
                            updateTrack(track.id, { name: prompt('New Track Name:', track.name) || track.name });
                        }}
                        sx={{ 
                            padding: '12px',
                            '@media (max-width: 600px)': {
                                padding: '8px',
                            }
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTrack(track.id);
                        }}
                        sx={{ 
                            padding: '12px',
                            '@media (max-width: 600px)': {
                                padding: '8px',
                            }
                        }}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Box>
            </TableCell>
        </TableRow>
    );

    const getTracks = () => {
        if (!playlist || !playlist.tracks) return [];
        return playlist.tracks;
    };

    const getCurrentTrack = () => {
        const tracks = getTracks();
        return tracks[currentTrackIndex] || null;
    };

    const fetchTrackDetails = async (videoId: string) => {
        const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
        if (!apiKey) {
            console.error('YouTube API key is missing. Please check your environment variables.');
            return;
        }
        try {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`);
            const trackName = response.data.items[0].snippet.title;
            const trackThumbnail = response.data.items[0].snippet.thumbnails.default.url;
            const trackDuration = response.data.items[0].contentDetails.duration;
            return { name: trackName, duration: trackDuration, thumbnail: trackThumbnail };
        } catch (error) {
            console.error('Error fetching track details:', error);
        }
    };

    const handlePlayPause = async () => {
        const currentTrack = getCurrentTrack();
        if (!currentTrack) return;
        
        try {
            if (currentTrack.type === 'youtube') {
                if (youtubeRef.current?.internalPlayer) {
                    if (isPlaying) {
                        await youtubeRef.current.internalPlayer.pauseVideo();
                    } else {
                        await youtubeRef.current.internalPlayer.playVideo();
                    }
                    setIsPlaying(!isPlaying);
                } else {
                    // If player not ready, reload the track
                    await handlePlayTrack(currentTrack);
                }
            } else {
                if (audioRef.current) {
                    if (isPlaying) {
                        audioRef.current.pause();
                    } else {
                        await audioRef.current.play();
                    }
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

    // Update YouTube time tracking
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
            if (timeUpdateInterval) {
                clearInterval(timeUpdateInterval);
            }
        };
    }, [youtubeVideoId, isPlaying, isDragging]);

    const handleNextTrack = () => {
        const tracks = getTracks();
        if (tracks.length === 0) return;
        
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        setCurrentTrackIndex(nextIndex);
        setCurrentTime(0);
        setIsPlaying(false);
        
        // Immediately play the next track
        const nextTrack = tracks[nextIndex];
        if (nextTrack) {
            handlePlayTrack(nextTrack).then(() => {
                setIsPlaying(true);
            });
        }
    };

    const handlePreviousTrack = () => {
        const tracks = getTracks();
        if (tracks.length === 0) return;
        
        const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
        setCurrentTrackIndex(prevIndex);
        setCurrentTime(0);
        setIsPlaying(false);
        
        // Immediately play the previous track
        const prevTrack = tracks[prevIndex];
        if (prevTrack) {
            handlePlayTrack(prevTrack).then(() => {
                setIsPlaying(true);
            });
        }
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return '0:00';
        
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
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
        } else {
            if (audioRef.current) {
                audioRef.current.playbackRate = rate;
                setPlaybackRate(rate);
            }
        }
    };

    const addLocalTrackToPlaylist = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const metadata = await getAudioMetadata(file);
            const newTrack: Track = {
                id: `local_${Date.now()}`,
                url: metadata.fileUrl,
                name: metadata.name,
                duration: metadata.duration,
                thumbnail: '',
                addedAt: Date.now(),
                type: 'local',
                metadata: {
                    lastModified: metadata.lastModified,
                    size: metadata.size
                }
            };
            
            await addTrack(newTrack);
            showToast('Local track added successfully', 'success');
        } catch (error) {
            showToast('Error adding local track', 'error');
            console.error('Error adding local track:', error);
        }
    };

    // Update handlePlayTrack for optimized loading
    const handlePlayTrack = async (track: Track) => {
        try {
            if (track.type === 'youtube') {
                const videoId = validateYouTubeUrl(track.url);
                if (videoId) {
                    setYoutubeVideoId(videoId);
                    setDuration(track.duration);
                    if (audioRef.current) {
                        audioRef.current.src = '';
                    }
                    if (youtubeRef.current?.internalPlayer) {
                        await youtubeRef.current.internalPlayer.loadVideoById({
                            videoId,
                            startSeconds: 0,
                            suggestedQuality: 'tiny' // Force lowest quality
                        });
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
            if (track?.type === 'local') {
                // Revoke the object URL when removing a local track
                URL.revokeObjectURL(track.url);
            }

            // Remove from favorites if it's favorited
            if (favorites.includes(trackId)) {
                const newFavorites = favorites.filter(id => id !== trackId);
                setFavorites(newFavorites);
                localStorage.setItem('favorites', JSON.stringify(newFavorites));
                if (user) {
                    await playlistService.toggleFavorite(user.uid, trackId, false);
                }
            }

            await removeTrack(trackId);
            showToast('Track removed successfully', 'success');
            
            // Force refresh if in favorites playlist
            if (currentPlaylistId === 'favorites') {
                refreshPlaylist();
            }

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
        stopYoutubeTimeUpdate(); // Clear any existing interval
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

    // Clean up on unmount
    useEffect(() => {
        return () => {
            stopYoutubeTimeUpdate();
            if (youtubeRef.current?.internalPlayer) {
                youtubeRef.current.internalPlayer.stopVideo();
            }
        };
    }, []);

    // Update YouTube player component
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
                    
                    // Only play if we're supposed to be playing
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
                // First get playlist details to show total count and get the name
                const details = await playlistService.fetchYouTubePlaylistDetails(playlistId);
                setImportProgress({ current: 0, total: details.itemCount });

                // Import the playlist with progress tracking
                const newPlaylistId = await playlistService.importYouTubePlaylist(
                    user.uid, 
                    playlistId, 
                    undefined, 
                    (current) => setImportProgress(prev => ({ ...prev, current }))
                );

                showToast(`YouTube playlist "${details.title}" imported successfully`, 'success');
                setYoutubePlaylistDialog(false);
                setNewPlaylistData(prev => ({ ...prev, youtubeUrl: '' }));
                
                // Reload playlists to update dropdown
                await loadPlaylists();
                // Switch to the newly imported playlist
                setCurrentPlaylistId(newPlaylistId);
                refreshPlaylist();
            }
        } catch (error: any) {
            showToast(error.message || 'Error importing playlist', 'error');
            console.error('Error importing playlist:', error);
        } finally {
            setImportLoading(false);
            setImportProgress({ current: 0, total: 0 });
        }
    };

    // Remove the trackNameStyles object and replace with simpler styles
    const cellStyles = {
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: { xs: '150px', sm: '250px' }
    };

    // Add this new helper function
    const renderEmptyRows = (count: number) => (
        Array.from({ length: count }).map((_, index) => (
            <TableRow key={`empty-${index}`}>
                <TableCell colSpan={isSmallScreen ? 4 : 5} sx={{ 
                    height: '57px',
                    borderBottom: index === count - 1 ? 'none' : undefined
                }} />
            </TableRow>
        ))
    );

    // Update the Queue List section
    const renderQueueTable = () => {
        const tracks = getTracks();
        const emptyRowsCount = Math.max(0, 5 - tracks.length);

        return (
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="tracks">
                    {(provided) => (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell 
                                            width="10%" 
                                            sx={{ 
                                                p: { xs: 0.5, sm: 1 },
                                                display: { xs: 'none', sm: 'table-cell' }
                                            }}
                                        ></TableCell>
                                        {!isSmallScreen && (
                                            <TableCell 
                                                width="10%"
                                                sx={{ p: { xs: 0.5, sm: 1 } }}
                                            >#</TableCell>
                                        )}
                                        <TableCell 
                                            width="45%"
                                            sx={{ p: { xs: 0.5, sm: 1 } }}
                                        >Name</TableCell>
                                        <TableCell 
                                            width="15%"
                                            sx={{ 
                                                p: { xs: 0.5, sm: 1 },
                                                display: { xs: 'none', sm: 'table-cell' }
                                            }}
                                        >Length</TableCell>
                                        <TableCell 
                                            width="10%" 
                                            align="center"
                                            sx={{ p: { xs: 0.5, sm: 1 } }}
                                        >Actions</TableCell>
                                        <TableCell 
                                            width="10%"
                                            sx={{ p: { xs: 0.5, sm: 1 } }}
                                        ></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                                    {tracks.map((track, index) => (
                                        <Draggable 
                                            key={track.id} 
                                            draggableId={track.id} 
                                            index={index}
                                        >
                                            {(provided) => (
                                                <TableRow
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    sx={{
                                                        backgroundColor: index === currentTrackIndex ? 'action.selected' : 'inherit',
                                                        '&:hover': {
                                                            backgroundColor: 'action.hover',
                                                        },
                                                    }}
                                                >
                                                    <TableCell 
                                                        sx={{ 
                                                            p: { xs: 0.5, sm: 1 },
                                                            display: { xs: 'none', sm: 'table-cell' }
                                                        }}
                                                    >
                                                        {track.type === 'youtube' ? <LanguageIcon /> : <InsertDriveFileIcon />}
                                                    </TableCell>
                                                    {!isSmallScreen && (
                                                        <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>
                                                            {index + 1}
                                                        </TableCell>
                                                    )}
                                                    {renderTrackNameCell(track, index)}
                                                    <TableCell 
                                                        sx={{ 
                                                            p: { xs: 0.5, sm: 1 },
                                                            display: { xs: 'none', sm: 'table-cell' }
                                                        }}
                                                    >
                                                        {formatDuration(track.duration)}
                                                    </TableCell>
                                                    <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>
                                                        <Box sx={{ 
                                                            display: 'flex', 
                                                            gap: 0.5,
                                                            justifyContent: 'center'
                                                        }}>
                                                            <IconButton 
                                                                onClick={() => handleTrackSelection(index)}
                                                                size="small"
                                                                sx={{ p: { xs: 0.5, sm: 1 } }}
                                                            >
                                                                {index === currentTrackIndex && isPlaying ? 
                                                                    <PauseIcon fontSize="small" /> : 
                                                                    <PlayArrowIcon fontSize="small" />}
                                                            </IconButton>
                                                            <IconButton 
                                                                onClick={() => handleRemoveTrack(track.id)}
                                                                size="small"
                                                                sx={{ p: { xs: 0.5, sm: 1 } }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell 
                                                        {...provided.dragHandleProps}
                                                        sx={{ 
                                                            cursor: 'move',
                                                            p: { xs: 0.5, sm: 1 }
                                                        }}
                                                    >
                                                        <DragHandleIcon fontSize="small" />
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Draggable>
                                    ))}
                                    {renderEmptyRows(emptyRowsCount)}
                                    {provided.placeholder}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Droppable>
            </DragDropContext>
        );
    };

    // Update the track name cell rendering in renderQueueTable
    const renderTrackNameCell = (track: Track, index: number) => (
        <TableCell 
            onClick={() => handleTrackSelection(index)}
            sx={{
                ...cellStyles,
                p: { xs: 0.5, sm: 1 }
            }}
        >
            {track.name || ''}
        </TableCell>
    );

    const renderMainContent = () => (
        <Box sx={{ width: '100%', mb: 2 }}>
            {getCurrentTrack()?.thumbnail && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <img 
                        src={getCurrentTrack().thumbnail} 
                        alt="Track Thumbnail" 
                        style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '8px',
                            objectFit: 'cover'
                        }}
                    />
                </Box>
            )}
            {renderMainTitle()}
            
            <Box sx={{ px: 2 }}>
                <Box display="flex" alignItems="center">
                    <Typography>{formatTime(currentTime)}</Typography>
                    <Slider
                        value={sliderValue}
                        max={duration || 100}
                        onChange={handleSliderChange}
                        onChangeCommitted={handleSliderChangeCommitted}
                        sx={{ mx: 2, flex: 1 }}
                    />
                    <Typography>{formatTime(duration)}</Typography>
                </Box>
            </Box>

            <PlaybackControls
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNext={handleNextTrack}
                onPrevious={handlePreviousTrack}
                onSeek={seek}
            />
            
            <SpeedControls onSpeedChange={changePlaybackRate} />
        </Box>
    );

    // For main content title, update the Box style:
    const renderMainTitle = () => (
        <Box sx={{
            width: '100%',
            height: '2em',
            mb: 2
        }}>
            <Typography 
                variant="h6" 
                component="div"
                align="center"
                sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {getCurrentTrack()?.name || 'No Track Selected'}
            </Typography>
        </Box>
    );

    const onDragEnd = async (result: any) => {
        if (!result.destination) return;

        const tracks = getTracks();
        const newTracks = Array.from(tracks);
        const [reorderedTrack] = newTracks.splice(result.source.index, 1);
        newTracks.splice(result.destination.index, 0, reorderedTrack);

        // Update tracks order
        const updatedPlaylist = {
            ...playlist!,
            tracks: newTracks,
            updatedAt: Date.now()
        };

        // Save to localStorage directly since we're using it as primary storage
        localStorage.setItem(`playlist_${currentPlaylistId}`, JSON.stringify(updatedPlaylist));
        
        // Force refresh the playlist to update the UI
        refreshPlaylist();
    };

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
                {/* Queue List */}
                <Paper elevation={3} sx={{ p: 2 }}>
                    <Typography variant="h6" align="center" gutterBottom>
                        Queue
                    </Typography>
                    <TableContainer>
                        {renderQueueTable()}
                    </TableContainer>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <TextField
                            label="YouTube URL"
                            value={newTrackUrl}
                            onChange={(e) => setNewTrackUrl(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <Button onClick={handleAddTrack} variant="contained">
                            Add
                        </Button>
                        <Button
                            variant="contained"
                            component="label"
                        >
                            Add File
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={addLocalTrackToPlaylist}
                                hidden
                            />
                        </Button>
                    </Box>
                </Paper>

                {/* Playlists */}
                <Paper elevation={3} sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Select
                            value={currentPlaylistId}
                            onChange={(e) => setCurrentPlaylistId(e.target.value)}
                            size="small"
                            fullWidth
                        >
                            {playlists.map((playlist) => (
                                <MenuItem key={playlist.id} value={playlist.id}>
                                    {playlist.name}
                                </MenuItem>
                            ))}
                        </Select>
                        <Button
                            startIcon={<PlaylistAddIcon />}
                            onClick={() => setNewPlaylistDialog(true)}
                            variant="contained"
                        >
                            New
                        </Button>
                        <Button
                            startIcon={<YouTubeIcon />}
                            onClick={() => setYoutubePlaylistDialog(true)}
                            variant="contained"
                        >
                            Import
                        </Button>
                    </Box>
                    <TableContainer>
                        {renderQueueTable()} {/* Use the same table renderer for consistency */}
                    </TableContainer>
                </Paper>
            </Box>

            {/* Dialogs */}
            {renderNewPlaylistDialog()}
            {renderYoutubePlaylistDialog()}
        </Box>
    );
};

export default AudioPlayer;