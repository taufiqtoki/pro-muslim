import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Slider, Typography, TextField, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, useMediaQuery, useTheme, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
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
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { usePlaylist } from '../hooks/usePlaylist.ts';
import { playlistService } from '../services/playlistService.ts';
import { Track } from '../types/playlist.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { storeFile, getFile, deleteFile } from '../utils/indexedDB.ts';
import { useToast } from '../contexts/ToastContext.tsx';

const AudioPlayer: React.FC = () => {
    const { showToast } = useToast();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
    const [newTrackUrl, setNewTrackUrl] = useState('');
    const [playbackRate, setPlaybackRate] = useState(1);
    const [newPlaylistDialog, setNewPlaylistDialog] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const audioRef = useRef<HTMLAudioElement>(null);
    const youtubeRef = useRef<any>(null);
    const { user } = useAuth();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [currentPlaylistId, setCurrentPlaylistId] = useState<string>('default');
    const { playlist, loading, error, addTrack, removeTrack, updateTrack } = usePlaylist(currentPlaylistId);

    const handleCreatePlaylist = async () => {
        if (user && newPlaylistName) {
            await playlistService.createPlaylist(user.uid, {
                name: newPlaylistName,
                description: '',
                tracks: [],
                isPublic: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            setNewPlaylistDialog(false);
            setNewPlaylistName('');
        }
    };

    const handleAddTrack = async () => {
        if (!newTrackUrl) return;
        
        try {
            // Fixed regex pattern without unnecessary escape
            const videoId = newTrackUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\s]{11})/)?.[1];
            
            if (!videoId) {
                showToast('Invalid YouTube URL', 'error');
                return;
            }

            const trackData = await fetchTrackDetails(videoId);
            if (trackData) {
                const newTrack: Track = {
                    id: Date.now().toString(),
                    url: newTrackUrl,
                    name: trackData.name || 'Untitled',
                    duration: trackData.duration || 0,
                    thumbnail: trackData.thumbnail || '',
                    addedAt: Date.now(),
                    type: 'youtube'
                };
                
                await addTrack(newTrack);
                showToast('Track added successfully', 'success');
                setNewTrackUrl('');
                setCurrentPlaylistId('default'); // Ensure we're on default playlist
            }
        } catch (error) {
            showToast('Error adding track', 'error');
            console.error('Error adding track:', error);
        }
    };

    const toggleFavorite = async (trackId: string) => {
        if (!user) return;
        const isFavorite = favorites.includes(trackId);
        await playlistService.toggleFavorite(user.uid, trackId, !isFavorite);
        setFavorites(prev => 
            isFavorite ? prev.filter(id => id !== trackId) : [...prev, trackId]
        );
    };

    const renderPlaylistSelector = () => (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Select
                value={currentPlaylistId}
                onChange={(e) => setCurrentPlaylistId(e.target.value)}
                sx={{ minWidth: 200 }}
            >
                <MenuItem value="default">Default Playlist</MenuItem>
                <MenuItem value="favorites">Favorites</MenuItem>
            </Select>
            <Button
                startIcon={<PlaylistAddIcon />}
                onClick={() => setNewPlaylistDialog(true)}
            >
                New Playlist
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
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setNewPlaylistDialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePlaylist}>Create</Button>
            </DialogActions>
        </Dialog>
    );

    const renderTrackRow = (track: Track, index: number) => (
        <TableRow
            key={track.id}
            sx={{
                backgroundColor: index === currentTrackIndex ? 'action.selected' : 'inherit',
            }}
            onClick={() => handleTrackSelection(index)}
        >
            <TableCell>{/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/.test(track.url) ? <LanguageIcon /> : <InsertDriveFileIcon />}</TableCell>
            {!isSmallScreen && <TableCell>{index + 1}</TableCell>}
            <TableCell>{track.name || ''}</TableCell>
            <TableCell>{formatTime(track.duration)}</TableCell>
            <TableCell>
                <Box display="flex" flexDirection={isSmallScreen ? 'column' : 'row'}>
                    <IconButton onClick={() => handleTrackSelection(index)}>
                        <PlayArrowIcon />
                    </IconButton>
                    <IconButton onClick={() => toggleFavorite(track.id)}>
                        {favorites.includes(track.id) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                    </IconButton>
                    <IconButton onClick={() => updateTrack(track.id, { name: prompt('New Track Name:', track.name) || track.name })}>
                        <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleRemoveTrack(track.id)}>
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

    const handlePlayPause = () => {
        const currentTrack = getCurrentTrack();
        if (!currentTrack) return;
        
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/;
        if (youtubeRegex.test(currentTrack.url)) {
            if (youtubeRef.current && youtubeRef.current.internalPlayer) {
                if (isPlaying) {
                    youtubeRef.current.internalPlayer.pauseVideo();
                } else {
                    youtubeRef.current.internalPlayer.playVideo();
                }
            }
        } else {
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play();
                }
            }
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (event: any, newValue: number | number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = newValue as number;
            setCurrentTime(newValue as number);
        }
    };

    const handleNextTrack = () => {
        const nextIndex = (currentTrackIndex + 1) % (playlist?.tracks.length || 1);
        setCurrentTrackIndex(nextIndex);
        setCurrentTime(0);
    };

    const handlePreviousTrack = () => {
        const prevIndex = (currentTrackIndex - 1 + (playlist?.tracks.length || 1)) % (playlist?.tracks.length || 1);
        setCurrentTrackIndex(prevIndex);
        setCurrentTime(0);
    };

    const formatTime = (time: number) => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        return `${hours}:${minutes}:${seconds}`;
    };

    const seek = (seconds: number) => {
        const currentTrack = getCurrentTrack();
        if (!currentTrack) return;
        
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/;
        if (youtubeRegex.test(currentTrack.url)) {
            youtubeRef.current.internalPlayer.seekTo(Math.min(Math.max(0, youtubeRef.current.internalPlayer.getCurrentTime() + seconds), duration), true);
        } else {
            if (audioRef.current) {
                audioRef.current.currentTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration);
                setCurrentTime(audioRef.current.currentTime);
            }
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
            const fileId = `local_${Date.now()}`;
            await storeFile(fileId, file);
            
            // Create audio element to get duration
            const audio = new Audio(URL.createObjectURL(file));
            await new Promise((resolve) => {
                audio.addEventListener('loadedmetadata', () => {
                    const newTrack: Track = {
                        id: fileId,
                        url: fileId, // Store fileId instead of blob URL
                        name: file.name,
                        duration: audio.duration,
                        thumbnail: '',
                        addedAt: Date.now(),
                        type: 'local'
                    };
                    
                    addTrack(newTrack);
                    resolve(true);
                });
            });
            showToast('Local track added successfully', 'success');
        } catch (error) {
            showToast('Error adding local track', 'error');
            console.error('Error adding local track:', error);
        }
    };

    const handlePlayTrack = async (track: Track) => {
        if (track.type === 'local') {
            try {
                const file = await getFile(track.url) as File;
                if (file) {
                    const blobUrl = URL.createObjectURL(file);
                    if (audioRef.current) {
                        audioRef.current.src = blobUrl;
                        audioRef.current.play();
                    }
                }
            } catch (error) {
                console.error('Error playing local file:', error);
            }
        }
        // ... handle other track types
    };

    const handleRemoveTrack = async (trackId: string) => {
        try {
            const track = playlist?.tracks.find(t => t.id === trackId);
            if (track?.type === 'local') {
                await deleteFile(track.url);
            }
            await removeTrack(trackId);
            showToast('Track removed successfully', 'success');
        } catch (error) {
            showToast('Error removing track', 'error');
            console.error('Error removing track:', error);
        }
    };

    const handleTrackSelection = async (index: number) => {
        setCurrentTrackIndex(index);
        setCurrentTime(0);
        setIsPlaying(false);
        
        const track = getTracks()[index];
        if (track) {
            await handlePlayTrack(track);
            setIsPlaying(true);
        }
    };

    return (
        <Box>
            {renderPlaylistSelector()}
            {renderNewPlaylistDialog()}
            {youtubeVideoId ? (
                <YouTube
                    videoId={youtubeVideoId}
                    ref={youtubeRef}
                    onStateChange={(event) => {
                        if (event.data === YouTube.PlayerState.ENDED) {
                            handleNextTrack();
                        }
                    }}
                    opts={{
                        height: '0',
                        width: '0',
                        playerVars: {
                            autoplay: isPlaying ? 1 : 0,
                            controls: 0,
                            start: Math.floor(currentTime),
                        },
                    }}
                />
            ) : (
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
                    value={currentTime}
                    max={duration || 0}
                    onChange={handleSeek}
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