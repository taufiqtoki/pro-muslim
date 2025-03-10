export interface Track {
  id: string;
  url: string;
  name: string;
  duration: number;
  thumbnail: string;
  addedAt: number;
  type: 'youtube' | 'local';
  metadata?: {
    lastModified: number;
    size: number;
    mimeType?: string; // Add this field
  };
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  tracks: Track[];
  isPublic: boolean;
  type: 'queue' | 'online' | 'offline' | 'favorites' | 'youtube' | 'custom';
  source?: {
    youtubePlaylistId?: string;
    url?: string;
  };
}

export interface UserPlaylists {
  queue: Playlist;
  online: Playlist;
  offline: Playlist;
  favorites: Playlist;
  custom: Playlist[];
  recentlyPlayed: string[];  // Track IDs
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: string;
    medium?: string;
    high?: string;
  };
  itemCount: number;
  isPrivate?: boolean;
}
