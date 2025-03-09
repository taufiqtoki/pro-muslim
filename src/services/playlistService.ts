import { db } from '../firebase.ts';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Track, Playlist, UserPlaylists } from '../types/playlist.ts';

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
      name: playlistId === 'default' ? 'Default Playlist' : playlistId,
      description: '',
      tracks: [],
      isPublic: false,
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
  }
};
