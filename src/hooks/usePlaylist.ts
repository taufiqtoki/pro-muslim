import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { playlistService } from '../services/playlistService.ts';
import { Track, Playlist } from '../types/playlist.ts';
import { db } from '../firebase.ts';
import { doc, getDoc } from 'firebase/firestore';

export const usePlaylist = (playlistId: string) => {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadPlaylist = useCallback(async () => {
    if (!user || !playlistId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Special handling for favorites playlist
      if (playlistId === 'favorites') {
        const userRef = doc(db, `users/${user.uid}`);
        const userDoc = await getDoc(userRef);
        const favoritesPlaylist = await playlistService.getPlaylist(user.uid, 'favorites');
        
        if (userDoc.exists() && favoritesPlaylist) {
          const userData = userDoc.data();
          const favoriteIds = userData.favorites || [];
          
          // Get all playlists to find favorite tracks
          const allPlaylists = await playlistService.getUserPlaylists(user.uid);
          const allTracks = Array.from(new Set(allPlaylists.flatMap(p => p.tracks)));
          const favoriteTracks = allTracks.filter(track => favoriteIds.includes(track.id));
          
          // Update favorites playlist with unique tracks
          const updatedPlaylist = {
            ...favoritesPlaylist,
            tracks: favoriteTracks,
            updatedAt: Date.now()
          };
          
          await playlistService.updatePlaylist(user.uid, 'favorites', updatedPlaylist);
          setPlaylist(updatedPlaylist);
        }
      } else {
        // Normal playlist handling
        const loadedPlaylist = await playlistService.getPlaylist(user.uid, playlistId);
        setPlaylist(loadedPlaylist);
      }
    } catch (err) {
      console.error('Error loading playlist:', err);
      setError('Error loading playlist');
    } finally {
      setLoading(false);
    }
  }, [user, playlistId]);

  const refreshPlaylist = () => {
    loadPlaylist();
  };

  useEffect(() => {
    loadPlaylist();
  }, [user, playlistId]);

  useEffect(() => {
    if (!user) {
      // Save to localStorage
      if (playlist) {
        localStorage.setItem(`playlist_${playlistId}`, JSON.stringify(playlist));
      }
    } else if (playlist) {
      // Sync with Firestore whenever playlist changes
      playlistService.updatePlaylist(user.uid, playlistId || 'default', playlist);
    }
  }, [playlist, user]);

  const removeTrack = async (trackId: string) => {
    // For non-logged in users
    if (!user) {
      setPlaylist(prev => {
        if (!prev) return null;
        const newPlaylist = {
          ...prev,
          tracks: prev.tracks.filter(t => t.id !== trackId),
          updatedAt: Date.now()
        };
        localStorage.setItem(`playlist_${playlistId}`, JSON.stringify(newPlaylist));
        return newPlaylist;
      });
      return;
    }

    try {
      // If in favorites playlist, remove from favorites
      if (playlistId === 'favorites') {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const newFavorites = favorites.filter((id: string) => id !== trackId);
        localStorage.setItem('favorites', JSON.stringify(newFavorites));
      }

      // Remove from Firestore
      await playlistService.removeTrackFromPlaylist(user.uid, playlistId || 'default', trackId);
      
      // Update local state
      setPlaylist(prev => {
        if (!prev) return null;
        return {
          ...prev,
          tracks: prev.tracks.filter(t => t.id !== trackId)
        };
      });

    } catch (error) {
      console.error('Error removing track:', error);
      throw error;
    }
  };

  const checkDuplicate = (track: Track, tracks: Track[]): boolean => {
    return tracks.some(t => {
      if (t.type === 'youtube' && track.type === 'youtube') {
        // Compare YouTube video IDs
        const tId = t.url.split('v=')[1];
        const trackId = track.url.split('v=')[1];
        return tId === trackId;
      }
      // For local files, compare URLs and names
      return t.url === track.url || 
             (t.type === 'local' && track.type === 'local' && t.name === track.name);
    });
  };

  const addTrack = useCallback(async (track: Track) => {
    setPlaylist(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tracks: [...prev.tracks, track],
        updatedAt: Date.now()
      };
    });
  }, []);

  const createPlaylist = async (playlist: Omit<Playlist, 'id'>) => {
    if (!user) {
      const newPlaylist: Playlist = {
        ...playlist,
        id: `local_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const localPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
      localPlaylists.push(newPlaylist);
      localStorage.setItem('playlists', JSON.stringify(localPlaylists));
      return newPlaylist.id;
    }

    try {
      const newPlaylistId = await playlistService.createPlaylist(user.uid, playlist);
      return newPlaylistId;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  };

  return {
    playlist,
    loading,
    error,
    addTrack,
    createPlaylist,
    addYouTubePlaylist: async (youtubePlaylistId: string) => {
      if (!user) {
        throw new Error('User must be logged in to import YouTube playlists');
      }

      try {
        const playlistDetails = await playlistService.fetchYouTubePlaylistDetails(youtubePlaylistId);
        const tracks = await playlistService.fetchYouTubePlaylistTracks(youtubePlaylistId);
        
        const newPlaylist: Playlist = {
          id: `youtube_${youtubePlaylistId}`,
          name: playlistDetails.title,
          description: playlistDetails.description,
          tracks,
          isPublic: false,
          type: 'youtube',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          source: {
            youtubePlaylistId,
            url: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`
          }
        };

        await playlistService.createPlaylist(user.uid, newPlaylist);
        setPlaylist(newPlaylist);
        return newPlaylist.id;
      } catch (error) {
        console.error('Error importing YouTube playlist:', error);
        throw error;
      }
    },
    removeTrack,
    updateTrack: async (trackId: string, updates: Partial<Track>) => {
      if (!user) return;
      await playlistService.updateTrackInPlaylist(user.uid, playlistId || 'default', trackId, updates);
      setPlaylist(prev => 
        prev
          ? { ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t) }
          : null
      );
    },
    refreshPlaylist
  };
};
