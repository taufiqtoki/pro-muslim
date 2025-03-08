export interface Track {
  id: string;
  url: string;
  name: string;
  duration: number;
  thumbnail: string;
  addedAt: number;
  type: 'youtube' | 'local';
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  tracks: Track[];
  isPublic: boolean;
}

export interface UserPlaylists {
  default: Playlist;
  custom: Playlist[];
  favorites: string[];  // Track IDs
  recentlyPlayed: string[];  // Track IDs
}
