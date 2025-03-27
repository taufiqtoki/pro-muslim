import React from 'react';
import { Track } from './playlist.ts';

export enum RepeatMode {
  NONE = 'NONE',
  ALL = 'ALL',
  ONE = 'ONE'
}

export interface MediaHandlers {
  handleTrackEnd: () => void;
  handleShuffleToggle: () => void;
  handlePlayPause: () => void;
  updateMediaSessionMetadata: (track: Track) => void;
  renderMainTitle: () => React.ReactElement;
}

export interface TableHandlers {
  renderQueueHeader: () => React.ReactElement;
  renderTableHeader: (isQueue: boolean) => React.ReactElement;
  renderQueueTrackRow: (track: Track, index: number) => React.ReactElement;
  renderPlaylistTrackRow: (track: Track, index: number) => React.ReactElement;
  renderPlaylistButtons: () => React.ReactElement;
  renderQueuePanel: () => React.ReactElement;
  renderPlaylistPanel: () => React.ReactElement;
  renderPlaylistDropdown: () => React.ReactElement;
  renderNewPlaylistDialog: () => React.ReactElement;
  renderYoutubePlaylistDialog: () => React.ReactElement;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
}
