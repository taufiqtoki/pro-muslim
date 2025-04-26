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

declare module 'react-window' {
  import * as React from 'react';
  
  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
  }
  
  export interface FixedSizeListProps {
    children: (props: ListChildComponentProps) => React.ReactNode;
    className?: string;
    height: number | string;
    itemCount: number;
    itemSize: number;
    width: number | string;
    overscanCount?: number;
    style?: React.CSSProperties;
  }
  
  export class FixedSizeList extends React.Component<FixedSizeListProps> {}
}
