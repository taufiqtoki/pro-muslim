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
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { usePlaylist } from '../hooks/usePlaylist.ts';
import { playlistService } from '../services/playlistService.ts';
import { Track } from '../types/playlist.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { db } from '../firebase.ts';
import { getVideoDetails, validateYouTubeUrl, formatDuration, extractYoutubePlaylistId } from '../utils/youtube.ts';
import { getAudioMetadata } from '../utils/audioMetadata.ts';

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

    const handleCreatePlaylist = async () => {
        if (user && newPlaylistData.name) {
            await playlistService.createPlaylist(user.uid, {
                name: newPlaylistData.name,
                description: '',
                tracks: [],
                isPublic: false,
                type: 'queue',
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            setNewPlaylistDialog(false);
            setNewPlaylistData(prev => ({ ...prev, name: '' }));
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
                <MenuItem value="queue">Queue</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
                <MenuItem value="favorites">Favorites</MenuItem>
                {/* Remove custom playlists for now since we're not using them */}
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
                // First get playlist details to show total count
                const details = await playlistService.fetchYouTubePlaylistDetails(playlistId);
                setImportProgress({ current: 0, total: details.itemCount });

                // Import the playlist with progress tracking
                const newPlaylistId = await playlistService.importYouTubePlaylist(
                    user.uid, 
                    playlistId, 
                    undefined, 
                    (current) => setImportProgress(prev => ({ ...prev, current }))
                );

                showToast('YouTube playlist imported successfully', 'success');
                setYoutubePlaylistDialog(false);
                setNewPlaylistData(prev => ({ ...prev, youtubeUrl: '' }));
                
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

    return (
        <Box>
            {renderPlaylistSelector()}
            {renderNewPlaylistDialog()}
            {renderYoutubePlaylistDialog()}
            {youtubeVideoId ? renderYoutubePlayer() : (
                <audio
                    ref={audioRef}
                    src={getCurrentTrack()?.url || ''}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                    onEnded={handleNextTrack}
                />
            )}

            <Box display="flex" flexDirection="column" alignItems="center" my={2}>
                {getCurrentTrack()?.thumbnail && (
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
                )}
                <Typography variant="h6" align="center" sx={{ mt: 1 }}>
                    {getCurrentTrack()?.name || 'No Track Selected'}
                </Typography>
            </Box>

            <Box display="flex" alignItems="center">
                <Typography>{formatTime(currentTime)}</Typography>
                <Slider
                    value={sliderValue}
                    max={duration || 100}
                    onChange={handleSliderChange}
                    onChangeCommitted={handleSliderChangeCommitted}
                    style={{ margin: '0 16px', flex: 1, color: 'lightgrey' }}
                />
                <Typography>{formatTime(duration)}</Typography>
            </Box>
            <Box display="flex" justifyContent="center" mt={2}>
                <Grid container spacing={1} justifyContent="center">
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={handlePreviousTrack}>
                            <SkipPreviousIcon />
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(-10)}>
                            -10s
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(-30)}>
                            -30s
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(-60)}>
                            -1m
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(-180)}>
                            -3m
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={handlePlayPause}>
                            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(10)}>
                            +10s
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(30)}>
                            +30s
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(60)}>
                            +1m
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={() => seek(180)}>
                            +3m
                        </IconButton>
                    </Grid>
                    <Grid item xs={2} sm={1}>
                        <IconButton onClick={handleNextTrack}>
                            <SkipNextIcon />
                        </IconButton>
                    </Grid>
                </Grid>
            </Box>

            <Box display="flex" justifyContent="center" mt={2}>
                <Grid container spacing={1} justifyContent="center">
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(0.75)}>0.75x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(0.5)}>0.5x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(1)}>1x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(1.25)}>1.25x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(1.5)}>1.5x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(1.75)}>1.75x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(2)}>2x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(3)}>3x</Button>
                    </Grid>
                    <Grid item xs={3} sm={1}>
                        <Button onClick={() => changePlaybackRate(4)}>4x</Button>
                    </Grid>
                </Grid>
            </Box>

            <Paper elevation={3} sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="center" p={2}>
                    <Typography variant="h6">Playlist</Typography>
                </Box>
                <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12} md={8}>
                        <Box display="flex" alignItems="center">
                            <TextField
                                label="YouTube URL"
                                value={newTrackUrl}
                                onChange={(e) => setNewTrackUrl(e.target.value)}
                                fullWidth
                            />
                            <Button onClick={handleAddTrack} variant="contained" color="primary" sx={{ height: '56px' }}>
                                Add
                            </Button>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            variant="contained"
                            component="label"
                            fullWidth
                            sx={{ height: '56px' }}
                        >
                            Add Local File
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={addLocalTrackToPlaylist}
                                hidden
                            />
                        </Button>
                    </Grid>
                </Grid>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Type</TableCell>
                                {!isSmallScreen && <TableCell>Serial</TableCell>}
                                <TableCell sx={{ width: '50%' }}>Name</TableCell>
                                <TableCell>Duration</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={isSmallScreen ? 4 : 5} align="center">Loading...</TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={isSmallScreen ? 4 : 5} align="center">Error: {error}</TableCell>
                                </TableRow>
                            ) : getTracks().length > 0 ? (
                                getTracks().map((track, index) => renderTrackRow(track, index))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={isSmallScreen ? 4 : 5} align="center">No tracks in playlist</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default AudioPlayer;