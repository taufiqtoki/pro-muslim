interface MediaMetadataInit {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
}

interface MediaPositionState {
  duration?: number;
  playbackRate?: number;
  position?: number;
}
