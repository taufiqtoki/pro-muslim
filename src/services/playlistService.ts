import { db } from '../firebase.ts';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { Track, Playlist, UserPlaylists, YouTubePlaylist } from '../types/playlist.ts';
import { parseDuration } from '../utils/youtube.ts';
import axios from 'axios';

// Add this interface for video details
interface VideoDetails {
    duration: number;
    isPlayable: boolean;
}

const fetchPlaylistTracks = async (playlistId: string): Promise<Track[]> => {
  // Implement the logic to fetch tracks from a YouTube playlist
  // This is a placeholder implementation
  const response = await axios.get(`/api/youtube/playlist/${playlistId}`);
  return response.data.tracks;
};

export const playlistService = {
  // Create a new playlist
  async createPlaylist(userId: string, playlist: Omit<Playlist, 'id'>): Promise<string> {
    const playlistsRef = collection(db, `users/${userId}/playlists`);
    
    // Validate playlist name first
    if (!playlist.name || playlist.name.trim().length === 0) {
      throw new Error('Playlist name cannot be empty');
    }

    // Check for duplicate names
    const existingPlaylists = await getDocs(playlistsRef);
    if (existingPlaylists.docs.some(doc => doc.data().name === playlist.name)) {
      throw new Error('A playlist with this name already exists');
    }

    // Generate a more predictable ID format
    const timestamp = Date.now();
    const newPlaylistId = `playlist_${timestamp}`;
    const playlistRef = doc(playlistsRef, newPlaylistId);

    await setDoc(playlistRef, {
      ...playlist,
      id: newPlaylistId,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return newPlaylistId;
  },

  // Add track to playlist
  async addTrackToPlaylist(userId: string, playlistId: string, track: Track): Promise<void> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    
    try {
      // First check if the playlist exists
      const playlistDoc = await getDoc(playlistRef);
      
      if (!playlistDoc.exists()) {
        // Create the playlist if it doesn't exist
        const newPlaylist: Playlist = {
          id: playlistId,
          name: playlistId === 'queue' ? 'Queue' : 'New Playlist',
          description: '',
          tracks: [track],
          isPublic: false,
          type: playlistId === 'queue' ? 'queue' : 'custom',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await setDoc(playlistRef, newPlaylist);
      } else {
        // Update existing playlist
        await updateDoc(playlistRef, {
          tracks: arrayUnion(track),
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      console.error('Error in addTrackToPlaylist:', error);
      throw error;
    }
  },

  // Remove track from playlist
  async removeTrackFromPlaylist(userId: string, playlistId: string, trackId: string): Promise<void> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    const playlist = await getDoc(playlistRef);
    const tracks = playlist.data()?.tracks.filter((t: Track) => t.id !== trackId);
    await updateDoc(playlistRef, {
      tracks,
      updatedAt: Date.now()
    });
  },

  // Add to recently played
  async addToRecentlyPlayed(userId: string, trackId: string): Promise<void> {
    const userRef = doc(db, `users/${userId}`);
    await updateDoc(userRef, {
      recentlyPlayed: arrayUnion(trackId)
    });
  },

  // Toggle favorite
  async toggleFavorite(userId: string, trackId: string, isFavorite: boolean): Promise<void> {
    const userRef = doc(db, `users/${userId}`);
    
    try {
        // First ensure the favorites array exists
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, { favorites: [] });
        }
        
        // Then update it
        await updateDoc(userRef, {
            favorites: isFavorite ? arrayUnion(trackId) : arrayRemove(trackId)
        });
    } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
  },

  // Sync local tracks
  async syncLocalTracks(userId: string, tracks: Track[]): Promise<void> {
    const userRef = doc(db, `users/${userId}`);
    await updateDoc(userRef, {
      localTracks: tracks
    });
  },

  // Get playlist from Firestore
  async getPlaylist(userId: string, playlistId: string): Promise<Playlist | null> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    const playlistDoc = await getDoc(playlistRef);
    
    if (playlistDoc.exists()) {
      return playlistDoc.data() as Playlist;
    }

    // Create default playlist if it doesn't exist
    const defaultPlaylist: Omit<Playlist, 'id'> = {
      name: playlistId === 'queue' ? 'Queue' : playlistId,
      description: '',
      tracks: [],
      isPublic: false,
      type: playlistId === 'queue' ? 'queue' : 'system',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(playlistRef, {
      ...defaultPlaylist,
      id: playlistId
    });

    return {
      ...defaultPlaylist,
      id: playlistId
    };
  },

  // Update entire playlist in Firestore
  async updatePlaylist(userId: string, playlistId: string, playlist: Playlist): Promise<void> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    
    try {
      const docSnap = await getDoc(playlistRef);
      
      if (!docSnap.exists()) {
        // Create the document if it doesn't exist
        await setDoc(playlistRef, {
          ...playlist,
          id: playlistId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // Update existing document
        await updateDoc(playlistRef, {
          ...playlist,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  },

  // Update a track within a playlist in Firestore
  async updateTrackInPlaylist(userId: string, playlistId: string, trackId: string, updates: Partial<Track>): Promise<void> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    const docSnap = await getDoc(playlistRef);
    if (docSnap.exists()) {
      const currentPlaylist = docSnap.data() as Playlist;
      const updatedTracks = currentPlaylist.tracks.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      );
      await updateDoc(playlistRef, {
        tracks: updatedTracks,
        updatedAt: Date.now(),
      });
    } else {
      throw new Error('Playlist not found');
    }
  },

  // Modify initializeDefaultPlaylists to only create default playlist
  async initializeDefaultPlaylists(userId: string): Promise<void> {
    const defaultPlaylist: Omit<Playlist, 'id'> = {
      name: 'New Playlist',
      description: '',
      tracks: [],
      isPublic: false,
      type: 'custom',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const batch = writeBatch(db);
    const playlistRef = doc(db, `users/${userId}/playlists/default`);
    
    batch.set(playlistRef, {
      ...defaultPlaylist,
      id: 'default'
    }, { merge: true });

    await batch.commit();
  },

  async importYouTubePlaylist(
    userId: string, 
    youtubePlaylistId: string, 
    accessToken?: string,
    onProgress?: (current: number) => void
  ): Promise<string> {
    try {
        // First fetch playlist details to validate access
        const playlist = await this.fetchYouTubePlaylistDetails(youtubePlaylistId, accessToken);
        
        // Then fetch all tracks with progress tracking
        const tracks = await this.fetchYouTubePlaylistTracks(
            youtubePlaylistId, 
            accessToken,
            (current) => onProgress?.(current)
        );

        // Create new playlist
        const playlistRef = doc(collection(db, `users/${userId}/playlists`));
        const newPlaylist: Omit<Playlist, 'id'> = {
            name: playlist.title,
            description: playlist.description,
            type: 'youtube',
            tracks,
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            source: {
                youtubePlaylistId,
                url: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`
            }
        };

        // Save to Firestore
        await setDoc(playlistRef, {
            ...newPlaylist,
            id: playlistRef.id
        });

        return playlistRef.id;
    } catch (error) {
        console.error('Error importing playlist:', error);
        throw error;
    }
  },

  async fetchYouTubePlaylistDetails(playlistId: string, accessToken?: string): Promise<YouTubePlaylist> {
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };

    // Add authorization header if access token is provided (for private playlists)
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails,status&id=${playlistId}&key=${apiKey}`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('Playlist not found or access denied');
        }

        const item = data.items[0];
        const isPrivate = item.status?.privacyStatus === 'private';

        if (isPrivate && !accessToken) {
            throw new Error('This is a private playlist. Please sign in with YouTube to access it.');
        }

        return {
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnails: item.snippet.thumbnails,
            itemCount: item.contentDetails.itemCount,
            isPrivate
        };
    } catch (error: any) {
        console.error('Error fetching playlist details:', error);
        throw new Error(error.message || 'Failed to fetch playlist details');
    }
  },

  async fetchYouTubePlaylistTracks(
    playlistId: string, 
    accessToken?: string,
    onProgress?: (current: number) => void
  ): Promise<Track[]> {
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    const tracks: Track[] = [];
    let nextPageToken: string | undefined;
    let failedItems = 0;
    let processedItems = 0;

    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
        do {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?` +
                `part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50` +
                `&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Get video IDs for duration lookup
            const videoIds = data.items
                .map((item: any) => item.contentDetails.videoId)
                .filter(Boolean)
                .join(',');
            
            if (!videoIds) {
                console.warn('No valid video IDs found in this batch');
                continue;
            }

            // Fetch video details
            const videosResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?` +
                `part=contentDetails,status&id=${videoIds}&key=${apiKey}`,
                { headers }
            );

            if (!videosResponse.ok) {
                throw new Error(`HTTP error! status: ${videosResponse.status}`);
            }

            const videosData = await videosResponse.json();
            const videoDetails = new Map<string, VideoDetails>(
                videosData.items.map((item: any) => [
                    item.id,
                    {
                        duration: parseDuration(item.contentDetails.duration),
                        isPlayable: item.status?.uploadStatus === 'processed' && 
                                  !item.status?.privacyStatus?.includes('private')
                    }
                ])
            );

            // Process each track
            for (const item of data.items) {
                try {
                    const videoId = item.contentDetails.videoId;
                    const details = videoDetails.get(videoId);

                    // Skip private, deleted, or unavailable videos
                    if (!details?.isPlayable) {
                        failedItems++;
                        continue;
                    }

                    tracks.push({
                        id: `yt_${videoId}`,
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        name: item.snippet.title,
                        duration: details.duration,
                        thumbnail: item.snippet.thumbnails?.default?.url || '',
                        addedAt: new Date(item.snippet.publishedAt).getTime(),
                        type: 'youtube'
                    });
                } catch (error) {
                    console.warn('Error processing playlist item:', error);
                    failedItems++;
                }
            }

            // Update progress after each batch
            processedItems += data.items.length;
            onProgress?.(processedItems);

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        if (failedItems > 0) {
            console.warn(`${failedItems} tracks were skipped due to availability issues`);
        }

        if (tracks.length === 0) {
            throw new Error('No playable tracks found in this playlist');
        }

        return tracks;

    } catch (error: any) {
        console.error('Error fetching playlist tracks:', error);
        throw new Error(error.message || 'Failed to fetch playlist tracks');
    }
  },

  async addToQueue(userId: string, track: Track): Promise<void> {
    const queue = await this.getOrCreateQueue(userId);
    const updatedTracks = [...queue.tracks, track];
    await this.saveQueue(userId, updatedTracks);
  },

  async clearQueue(userId: string): Promise<void> {
    await this.saveQueue(userId, []);
  },

  // Move track to specific position in playlist
  async moveTrack(userId: string, playlistId: string, trackId: string, newIndex: number): Promise<void> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    const playlist = await getDoc(playlistRef);
    
    if (playlist.exists()) {
        const tracks = [...playlist.data().tracks];
        const currentIndex = tracks.findIndex(t => t.id === trackId);
        
        if (currentIndex !== -1) {
            const [track] = tracks.splice(currentIndex, 1);
            tracks.splice(newIndex, 0, track);
            
            await updateDoc(playlistRef, {
                tracks,
                updatedAt: Date.now()
            });
        }
    }
  },

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const playlists: Playlist[] = [];
    const playlistsRef = collection(db, `users/${userId}/playlists`);
    const snapshot = await getDocs(playlistsRef);
    snapshot.forEach(doc => {
        playlists.push(doc.data() as Playlist);
    });
    return playlists;
  },

  // Add this new method
  async deletePlaylist(userId: string, playlistId: string): Promise<void> {
    if (!userId || !playlistId) return;

    // Don't allow deletion of system playlists
    if (['favorites', 'default'].includes(playlistId)) {
      throw new Error('Cannot delete system playlist');
    }

    try {
      // Delete from Firestore
      const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
      await deleteDoc(playlistRef);
      
      // Clean up any related data (like tracks)
      const userRef = doc(db, `users/${userId}`);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Remove any favorites that were in this playlist
        if (userData.favorites) {
          const playlistDoc = await getDoc(playlistRef);
          if (playlistDoc.exists()) {
            const playlistData = playlistDoc.data();
            const trackIds = playlistData.tracks.map((t: Track) => t.id);
            const newFavorites = userData.favorites.filter((id: string) => !trackIds.includes(id));
            await updateDoc(userRef, { favorites: newFavorites });
          }
        }
      }

      // Clean up local storage
      const localPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
      const filteredPlaylists = localPlaylists.filter((p: Playlist) => p.id !== playlistId);
      localStorage.setItem('playlists', JSON.stringify(filteredPlaylists));

    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  },

  async cleanupMalformedPlaylists(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const playlistsRef = collection(db, `users/${userId}/playlists`);
      const snapshot = await getDocs(playlistsRef);
      
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        const playlistId = doc.id;
        // Delete playlists with malformed IDs (like the one you mentioned)
        if (!playlistId.startsWith('playlist_') && 
            !['favorites', 'default'].includes(playlistId)) {
          batch.delete(doc.ref);
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up playlists:', error);
    }
  },

  // Add this new method for queue management
  async getQueueTracks(userId: string): Promise<Track[]> {
    try {
      const queueRef = doc(db, `users/${userId}/playlists/queue`);
      const queueDoc = await getDoc(queueRef);
      
      if (!queueDoc.exists()) {
        // Initialize empty queue if it doesn't exist
        const emptyQueue = {
          id: 'queue',
          name: 'Queue',
          description: 'Current playing queue',
          tracks: [],
          isPublic: false,
          type: 'queue',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(queueRef, emptyQueue);
        return [];
      }
      
      return queueDoc.data().tracks || [];
    } catch (error) {
      console.error('Error getting queue tracks:', error);
      return [];
    }
  },

  async updateQueue(userId: string, tracks: Track[]): Promise<void> {
    if (!userId) return;
    
    const queueRef = doc(db, `users/${userId}/playlists/queue`);
    
    try {
      // Always use setDoc to either create or update the queue
      await setDoc(queueRef, {
        id: 'queue',
        name: 'Queue',
        description: 'Current playing queue',
        tracks,
        isPublic: false,
        type: 'queue',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error updating queue:', error);
      throw error;
    }
  },

  async removeFromQueue(userId: string, trackId: string): Promise<void> {
    const queue = await this.getOrCreateQueue(userId);
    const updatedTracks = queue.tracks.filter(t => t.id !== trackId);
    await this.saveQueue(userId, updatedTracks);
  },

  async initializeUserPlaylists(userId: string): Promise<void> {
    if (!userId) return;

    const batch = writeBatch(db);
    const playlistsToInit = [
      {
        id: 'queue',
        name: 'Queue',
        description: 'Current playing queue',
        tracks: [],
        isPublic: false,
        type: 'queue'
      },
      {
        id: 'favorites',
        name: 'Favorites',
        description: 'Your favorite tracks',
        tracks: [],
        isPublic: false,
        type: 'system'
      },
      {
        id: 'default',
        name: 'Default Playlist',
        description: 'Default playlist',
        tracks: [],
        isPublic: false,
        type: 'system'
      }
    ];

    try {
      for (const playlist of playlistsToInit) {
        const ref = doc(db, `users/${userId}/playlists/${playlist.id}`);
        const docSnap = await getDoc(ref);
        
        if (!docSnap.exists()) {
          batch.set(ref, {
            ...playlist,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error initializing user playlists:', error);
      throw error;
    }
  },

  async getOrCreateQueue(userId: string): Promise<Playlist> {
    if (!userId) throw new Error('User ID is required');

    const queueRef = doc(db, `users/${userId}/playlists/queue`);
    
    try {
      const queueDoc = await getDoc(queueRef);
      
      if (queueDoc.exists()) {
        return queueDoc.data() as Playlist;
      }

      // Create new queue if it doesn't exist
      const newQueue: Playlist = {
        id: 'queue',
        name: 'Queue',
        description: 'Current playing queue',
        tracks: [],
        isPublic: false,
        type: 'queue',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(queueRef, newQueue);
      return newQueue;
    } catch (error) {
      console.error('Error in getOrCreateQueue:', error);
      throw error;
    }
  },

  async saveQueue(userId: string, tracks: Track[]): Promise<void> {
    if (!userId) throw new Error('User ID is required');

    const queueRef = doc(db, `users/${userId}/playlists/queue`);
    
    try {
      const queueDoc = await getDoc(queueRef);
      
      if (!queueDoc.exists()) {
        // Create queue with tracks if it doesn't exist
        await setDoc(queueRef, {
          id: 'queue',
          name: 'Queue',
          description: 'Current playing queue',
          tracks,
          isPublic: false,
          type: 'queue',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } else {
        // Update existing queue
        await updateDoc(queueRef, {
          tracks,
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      console.error('Error saving queue:', error);
      throw error;
    }
  },

  fetchPlaylistTracks,

  // Fix: Change get() to getDoc()
  loadQueue: async (userId: string): Promise<Track[]> => {
    const userRef = doc(db, `users/${userId}`);
    const userDoc = await getDoc(userRef); // Changed from get() to getDoc()
    return userDoc.exists() ? (userDoc.data()?.queue || []) : [];
  },

  defaultPlaylist: {
    id: 'default',
    name: 'Default Playlist',
    description: '',
    tracks: [],
    isPublic: false,
    type: 'system' as const,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  // Add this method to playlistService
  async getTracksByIds(userId: string, trackIds: string[]): Promise<Track[]> {
    if (!trackIds.length) return [];
    
    try {
      const playlists = await this.getUserPlaylists(userId);
      const allTracks = playlists.flatMap(p => p.tracks || []);
      return trackIds.map(id => allTracks.find(t => t.id === id)).filter(Boolean) as Track[];
    } catch (error) {
      console.error('Error getting tracks by IDs:', error);
      return [];
    }
  },
};

// Add this method if it doesn't exist

export const getPlaylist = async (userId: string, playlistId: string): Promise<Playlist | null> => {
  try {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    const playlistDoc = await getDoc(playlistRef);
    
    if (playlistDoc.exists()) {
      return playlistDoc.data() as Playlist;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting playlist:', error);
    return null;
  }
};
