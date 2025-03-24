import React from 'react';
import { Track } from '../../types/playlist';

export interface AudioPlayerStyles {
  tableContainerSx: React.CSSProperties;
  commonTableSx: React.CSSProperties;
  actionButtonsSx: React.CSSProperties;
}

export interface AudioPlayerHandlers {
  handleQueueDrop: (url: string) => Promise<void>;
  handlePlaylistDrop: (url: string) => Promise<void>;
  handleQueueUrlSubmit: () => Promise<void>;
  handlePlaylistUrlSubmit: () => Promise<void>;
  handlePlayTrack: (track: Track) => Promise<void>;
  handleTrackNameClick: (index: number) => Promise<void>;
  handleDeletePlaylist: () => Promise<void>;
  handleAddPlaylistToQueue: (playlist: any) => Promise<void>;
  handleSaveQueue: () => Promise<void>;
  initializeFavoritesPlaylist: () => Promise<void>;
  getFavoritesPlaylist: () => any;
  loadQueueTracks: () => Promise<Track[]>;
}
