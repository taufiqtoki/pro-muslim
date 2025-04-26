export const workerCode = () => {
  self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
      case 'PARSE_DURATION':
        try {
          const { raw } = payload;
          const matches = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (!matches) {
            self.postMessage({ error: 'Invalid duration format' });
            return;
          }

          const hours = parseInt(matches[1] || '0');
          const minutes = parseInt(matches[2] || '0');
          const seconds = parseInt(matches[3] || '0');
          
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          
          self.postMessage({
            type: 'DURATION_PARSED',
            payload: {
              raw,
              parsed: totalSeconds,
              formatted: formatDuration(totalSeconds)
            }
          });
        } catch (error: unknown) {
          self.postMessage({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
        break;

      case 'PROCESS_TRACKS':
        try {
          const { tracks } = payload;
          // Process tracks in background
          const processedTracks = tracks.map((track: { [key: string]: any }) => ({
            ...track,
            processedAt: Date.now()
          }));
          
          self.postMessage({
            type: 'TRACKS_PROCESSED',
            payload: processedTracks
          });
        } catch (error: unknown) {
          self.postMessage({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
        break;
    }
  };

  // Helper function
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
    }
    return `${minutes}:${padZero(remainingSeconds)}`;
  };

  const padZero = (num: number): string => {
    return num.toString().padStart(2, '0');
  };
};

// Type definitions for better TypeScript support
export interface ProcessTrackPayload {
  tracks: Array<{ [key: string]: any }>;
}

export interface ParseDurationPayload {
  raw: string;
}

export type WorkerPayload = ProcessTrackPayload | ParseDurationPayload;

export type WorkerMessage = {
  type: 'PARSE_DURATION' | 'PROCESS_TRACKS';
  payload: WorkerPayload;
};

export type WorkerResponse = {
  type: 'DURATION_PARSED' | 'TRACKS_PROCESSED';
  payload: any;
  error?: string;
};
