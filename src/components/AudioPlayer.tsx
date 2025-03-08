import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Slider, Typography, TextField, Button, ListItem, ListItemText, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import YouTube from 'react-youtube';
import axios from 'axios';
import { FixedSizeList, ListChildComponentProps } from 'react-window';

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
        try {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=YOUR_API_KEY&part=snippet,contentDetails`);
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
            if (isPlaying) {
                youtubeRef.current.internalPlayer.pauseVideo();
            } else {
                youtubeRef.current.internalPlayer.playVideo();
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
            setDuration(audioRef.current.duration);
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
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
        let trackName = '';
        let trackDuration = 0;
        let trackThumbnail = '';
        if (youtubeRegex.test(newTrackUrl)) {
            const videoId = newTrackUrl.split('v=')[1]?.split('&')[0];
            try {
                const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=YOUR_API_KEY&part=snippet,contentDetails`);
                trackName = response.data.items[0].snippet.title;
                trackThumbnail = response.data.items[0].snippet.thumbnails.default.url;
                trackDuration = response.data.items[0].contentDetails.duration; // Assuming duration is in ISO 8601 format
            } catch (error) {
                console.error('Error fetching track details:', error);
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
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration);
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const changePlaybackRate = (rate: number) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
            setPlaybackRate(rate);
        }
    };

    const renderRow = ({ index, style }: ListChildComponentProps) => {
        const track = playlist[index] || localPlaylist[index - playlist.length];
        return (
            <ListItem
                key={track.id}
                style={style}
                component="li"
                sx={{
                    backgroundColor: index === currentTrackIndex ? 'action.selected' : 'inherit',
                }}
                onClick={() => setCurrentTrackIndex(index)}
            >
                <ListItemText primary={track.name} secondary={track.url} />
                <IconButton onClick={() => editTrackName(track.id, prompt('New Track Name:', track.name) || track.name)}>
                    <EditIcon />
                </IconButton>
                <IconButton onClick={() => deleteTrackFromPlaylist(track.id)}>
                    <DeleteIcon />
                </IconButton>
            </ListItem>
        );
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

            <Typography variant="h6">{getCurrentTrack()?.name || 'No Track Selected'}</Typography>
            {getCurrentTrack()?.thumbnail && (
                <img src={getCurrentTrack().thumbnail} alt="Track Thumbnail" />
            )}

            <Box display="flex" alignItems="center">
                <Typography>{formatTime(currentTime)}</Typography>
                <Slider
                    value={currentTime}
                    max={duration}
                    onChange={handleSeek}
                    style={{ margin: '0 16px', flex: 1, color: 'lightgrey' }}
                />
                <Typography>{formatTime(duration)}</Typography>
            </Box>
            <Box display="flex" justifyContent="center" mt={2}>
                <IconButton onClick={handlePreviousTrack}>
                    <SkipPreviousIcon />
                </IconButton>
                <IconButton onClick={() => seek(-10)}>
                    -10s
                </IconButton>
                <IconButton onClick={() => seek(-30)}>
                    -30s
                </IconButton>
                <IconButton onClick={() => seek(-60)}>
                    -1m
                </IconButton>
                <IconButton onClick={() => seek(-180)}>
                    -3m
                </IconButton>
                <IconButton onClick={handlePlayPause}>
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton onClick={() => seek(10)}>
                    +10s
                </IconButton>
                <IconButton onClick={() => seek(30)}>
                    +30s
                </IconButton>
                <IconButton onClick={() => seek(60)}>
                    +1m
                </IconButton>
                <IconButton onClick={() => seek(180)}>
                    +3m
                </IconButton>
                <IconButton onClick={handleNextTrack}>
                    <SkipNextIcon />
                </IconButton>
            </Box>
            <Box display="flex" justifyContent="center" mt={2}>
                <Button onClick={() => changePlaybackRate(0.75)}>0.75x</Button>
                <Button onClick={() => changePlaybackRate(0.5)}>0.5x</Button>
                <Button onClick={() => changePlaybackRate(1)}>1x</Button>
                <Button onClick={() => changePlaybackRate(1.25)}>1.25x</Button>
                <Button onClick={() => changePlaybackRate(1.5)}>1.5x</Button>
                <Button onClick={() => changePlaybackRate(1.75)}>1.75x</Button>
                <Button onClick={() => changePlaybackRate(2)}>2x</Button>
                <Button onClick={() => changePlaybackRate(3)}>3x</Button>
                <Button onClick={() => changePlaybackRate(4)}>4x</Button>
            </Box>

            <Box mt={2}>
                <TextField
                    label="YouTube URL"
                    value={newTrackUrl}
                    onChange={(e) => setNewTrackUrl(e.target.value)}
                    fullWidth
                />
                <Button onClick={addTrackToPlaylist} variant="contained" color="primary" fullWidth>
                    Add to Playlist
                </Button>
                <input
                    type="file"
                    accept="audio/*"
                    onChange={addLocalTrackToPlaylist}
                    style={{ marginTop: '16px' }}
                />
            </Box>

            <Paper elevation={3} sx={{ mt: 2 }}>
                <Typography variant="h6">YouTube Playlist</Typography>
                <FixedSizeList
                    height={400}
                    width={360}
                    itemSize={46}
                    itemCount={playlist.length + localPlaylist.length}
                    overscanCount={5}
                >
                    {renderRow}
                </FixedSizeList>
            </Paper>
        </Box>
    );
};

export default AudioPlayer;