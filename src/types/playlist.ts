export interface Track {
  id: string;
  url: string;
  name: string;
  duration: number;
  thumbnail: string;
  addedAt: number;
  type: 'youtube' | 'local';
  metadata?: {
    lastModified?: number;
    size?: number;
    mimeType?: string;
  };
  videoId?: string; // Add this field for YouTube tracks
  localFileData?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  fileData?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
  isPublic: boolean;
  type: 'custom' | 'youtube' | 'system' | 'queue';
  createdAt: number;
  updatedAt: number;
  userId?: string;
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
