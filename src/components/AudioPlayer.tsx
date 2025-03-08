import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Slider, Typography, TextField, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, useMediaQuery, useTheme } from '@mui/material';
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
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

interface PlaylistItem {
    id: string;
    url: string;
    name: string;
    duration: number;
    thumbnail: string;
}

const AudioPlayer: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
    const [localPlaylist, setLocalPlaylist] = useState<PlaylistItem[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
    const [newTrackUrl, setNewTrackUrl] = useState('');
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);
    const youtubeRef = useRef<any>(null);
    const db = getFirestore();
    const auth = getAuth();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        const loadPlaylist = async () => {
            const user = auth.currentUser;
            if (user) {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPlaylist(data.playlist || []);
                    setLocalPlaylist(data.localPlaylist || []);
                }
            } else {
                const localData = localStorage.getItem('playlistData');
                if (localData) {
                    const { playlist, localPlaylist } = JSON.parse(localData);
                    setPlaylist(playlist);
                    setLocalPlaylist(localPlaylist);
                }
            }
        };
        loadPlaylist();
    }, [auth, db]);

    useEffect(() => {
        const savePlaylist = async () => {
            const user = auth.currentUser;
            const data = { playlist, localPlaylist };
            if (user) {
                await setDoc(doc(db, 'users', user.uid), data);
            } else {
                localStorage.setItem('playlistData', JSON.stringify(data));
            }
        };
        savePlaylist();
    }, [playlist, localPlaylist, auth, db]);

    useEffect(() => {
        const currentTrack = getCurrentTrack();
        if (currentTrack) {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
            if (youtubeRegex.test(currentTrack.url)) {
                const videoId = currentTrack.url.split('v=')[1]?.split('&')[0];
                setYoutubeVideoId(videoId);
                fetchTrackDetails(videoId, currentTrackIndex);
            } else {
                setYoutubeVideoId(null);
            }
        }
    }, [currentTrackIndex, playlist, localPlaylist]);

    const getCurrentTrack = () => {
        return playlist[currentTrackIndex] || localPlaylist[currentTrackIndex];
    };

  const fetchTrackDetails = async (videoId: string, index: number) => {
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('YouTube API key is missing. Please check your environment variables.');
      return;
    }
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`);
      const trackName = response.data.items[0].snippet.title;
      const trackThumbnail = response.data.items[0].snippet.thumbnails.default.url;
      const trackDuration = response.data.items[0].contentDetails.duration; // Assuming duration is in ISO 8601 format
      setPlaylist(playlist.map((track, i) => i === index ? { ...track, name: trackName, duration: trackDuration, thumbnail: trackThumbnail } : track));
    } catch (error) {
      console.error('Error fetching track details:', error);
    }
  };

  const handlePlayPause = () => {
    const currentTrack = getCurrentTrack();
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
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
    const nextIndex = (currentTrackIndex + 1) % (playlist.length + localPlaylist.length);
    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
};

const handlePreviousTrack = () => {
    const prevIndex = (currentTrackIndex - 1 + (playlist.length + localPlaylist.length)) % (playlist.length + localPlaylist.length);
    setCurrentTrackIndex(prevIndex);
    setCurrentTime(0);
};

const addTrackToPlaylist = async () => {
    const apiKey = 'AIzaSyAPH1MjQFS1TNgfar5xKB-deafl8h0IZzA';
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
    let trackName = '';
    let trackDuration = 0;
    let trackThumbnail = '';
    if (youtubeRegex.test(newTrackUrl)) {
        const videoId = newTrackUrl.split('v=')[1]?.split('&')[0];
        if (!apiKey) {
            console.error('YouTube API key is missing.');
            return;
        }
        try {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`);
            trackName = response.data.items[0].snippet.title;
            trackThumbnail = response.data.items[0].snippet.thumbnails.default.url;
            trackDuration = response.data.items[0].contentDetails.duration; // Assuming duration is in ISO 8601 format
        } catch (error) {
            if (error.response) {
                console.error('Error fetching track details:', error.response.data);
            } else {
                console.error('Error fetching track details:', error.message);
            }
        }
    }
    const newTrack: PlaylistItem = { id: Date.now().toString(), url: newTrackUrl, name: trackName, duration: trackDuration, thumbnail: trackThumbnail };
    setPlaylist([...playlist, newTrack]);
    setNewTrackUrl('');
};

const addLocalTrackToPlaylist = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const newTrack: PlaylistItem = { id: Date.now().toString(), url: URL.createObjectURL(file), name: file.name, duration: 0, thumbnail: '' };
        setLocalPlaylist([...localPlaylist, newTrack]);
    }
};

const deleteTrackFromPlaylist = (id: string) => {
    setPlaylist(playlist.filter(track => track.id !== id));
};

const deleteLocalTrackFromPlaylist = (id: string) => {
    setLocalPlaylist(localPlaylist.filter(track => track.id !== id));
};

const editTrackName = (id: string, newName: string) => {
    setPlaylist(playlist.map(track => track.id === id ? { ...track, name: newName } : track));
};

const editLocalTrackName = (id: string, newName: string) => {
    setLocalPlaylist(localPlaylist.map(track => track.id === id ? { ...track, name: newName } : track));
};

const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours}:${minutes}:${seconds}`;
};

const seek = (seconds: number) => {
    const currentTrack = getCurrentTrack();
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
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
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
    if (youtubeRegex.test(currentTrack.url)) {
        youtubeRef.current.internalPlayer.setPlaybackRate(rate);
    } else {
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
            setPlaybackRate(rate);
        }
    }
};

const handleTrackSelection = (index: number) => {
    setCurrentTrackIndex(index);
    setCurrentTime(0);
    setIsPlaying(false);
    setTimeout(() => {
        setIsPlaying(true);
        handlePlayPause();
    }, 0);
};

return (
    <Box>
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
                        <Button onClick={addTrackToPlaylist} variant="contained" color="primary" sx={{ height: '56px' }}>
                            Add
                        </Button>
                    </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Button
                        variant="contained"
                        component="label"
                        fullWidth
                        sx={{ height: '56px' }} // Set the height to match the text field and button
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
                        {playlist.map((track, index) => {
                            const isOnline = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/.test(track.url);
                            return (
                                <TableRow
                                    key={track.id}
                                    sx={{
                                        backgroundColor: index === currentTrackIndex ? 'action.selected' : 'inherit',
                                    }}
                                    onClick={() => handleTrackSelection(index)}
                                >
                                    <TableCell>{isOnline ? <LanguageIcon /> : <InsertDriveFileIcon />}</TableCell>
                                    {!isSmallScreen && <TableCell>{index + 1}</TableCell>}
                                    <TableCell>{track.name || ''}</TableCell>
                                    <TableCell>{formatTime(track.duration)}</TableCell>
                                    <TableCell>
                                        <Box display="flex" flexDirection={isSmallScreen ? 'column' : 'row'}>
                                            <IconButton onClick={() => handleTrackSelection(index)}>
                                                <PlayArrowIcon />
                                            </IconButton>
                                            <IconButton onClick={() => editTrackName(track.id, prompt('New Track Name:', track.name) || track.name)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton onClick={() => deleteTrackFromPlaylist(track.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {localPlaylist.map((track, index) => {
                            const isOnline = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/.test(track.url);
                            return (
                                <TableRow
                                    key={track.id}
                                    sx={{
                                        backgroundColor: index + playlist.length === currentTrackIndex ? 'action.selected' : 'inherit',
                                    }}
                                    onClick={() => handleTrackSelection(index + playlist.length)}
                                >
                                    <TableCell>{isOnline ? <LanguageIcon /> : <InsertDriveFileIcon />}</TableCell>
                                    {!isSmallScreen && <TableCell>{index + playlist.length + 1}</TableCell>}
                                    <TableCell>{track.name || ''}</TableCell>
                                    <TableCell>{formatTime(track.duration)}</TableCell>
                                    <TableCell>
                                        <Box display="flex" flexDirection={isSmallScreen ? 'column' : 'row'}>
                                            <IconButton onClick={() => handleTrackSelection(index + playlist.length)}>
                                                <PlayArrowIcon />
                                            </IconButton>
                                            <IconButton onClick={() => editLocalTrackName(track.id, prompt('New Track Name:', track.name) || track.name)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton onClick={() => deleteLocalTrackFromPlaylist(track.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    </Box>
);
};

export default AudioPlayer;