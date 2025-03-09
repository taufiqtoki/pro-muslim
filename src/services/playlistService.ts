import { db } from '../firebase.ts';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { Track, Playlist, UserPlaylists, YouTubePlaylist } from '../types/playlist.ts';
import { parseDuration } from '../utils/youtube.ts';

// Add this interface for video details
interface VideoDetails {
    duration: number;
    isPlayable: boolean;
}

export const playlistService = {
  // Create a new playlist
  async createPlaylist(userId: string, playlist: Omit<Playlist, 'id'>): Promise<string> {
    const playlistRef = doc(collection(db, `users/${userId}/playlists`));
    await setDoc(playlistRef, {
      ...playlist,
      id: playlistRef.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return playlistRef.id;
  },

  // Add track to playlist
  async addTrackToPlaylist(userId: string, playlistId: string, track: Track): Promise<void> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    await updateDoc(playlistRef, {
      tracks: arrayUnion(track),
      updatedAt: Date.now()
    });
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
  async getPlaylist(userId: string, playlistId: string): Promise<Playlist> {
    const playlistRef = doc(db, `users/${userId}/playlists/${playlistId}`);
    const playlistSnap = await getDoc(playlistRef);
    
    if (playlistSnap.exists()) {
      return playlistSnap.data() as Playlist;
    }

    // Create default playlist if it doesn't exist
    const defaultPlaylist: Omit<Playlist, 'id'> = {
      name: playlistId === 'queue' ? 'Queue' : playlistId,
      description: '',
      tracks: [],
      isPublic: false,
      type: 'queue',
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
    await updateDoc(playlistRef, {
      ...playlist,
      updatedAt: Date.now(),
    });
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

  async initializeDefaultPlaylists(userId: string): Promise<void> {
    const defaultPlaylists = ['queue', 'online', 'offline', 'favorites'];
    const batch = writeBatch(db);  // Fix batch creation

    for (const type of defaultPlaylists) {
        const playlistRef = doc(db, `users/${userId}/playlists/${type}`);
        batch.set(playlistRef, {
            id: type,
            name: type.charAt(0).toUpperCase() + type.slice(1),
            type: type as 'queue' | 'online' | 'offline' | 'favorites',
            tracks: [],
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }, { merge: true });
    }

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
    await this.addTrackToPlaylist(userId, 'queue', track);
  },

  async clearQueue(userId: string): Promise<void> {
    const queueRef = doc(db, `users/${userId}/playlists/queue`);
    await updateDoc(queueRef, {
        tracks: [],
        updatedAt: Date.now()
    });
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
  }
};
