import React from 'react';
import { Box, Paper, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Track } from '../../types/playlist';

interface TrackListProps {
  title: string;
  tracks: Track[];
  loading?: boolean;
  error?: string | null;
  onAddYouTube: (url: string) => void;
  onAddFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTrackSelect: (index: number) => void;
  renderRow: (track: Track, index: number) => React.ReactNode;
}

const TrackList: React.FC<TrackListProps> = ({
  title,
  tracks,
  loading,
  error,
  onAddYouTube,
  onAddFile,
  onTrackSelect,
  renderRow
}) => {
  const [youtubeUrl, setYoutubeUrl] = React.useState('');

  return (
    <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
      <Typography variant="h6" align="center" gutterBottom>
        {title}
      </Typography>

      <TableContainer>
        {/* ...existing table code... */}
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Box flex={1}>
          <TextField
            label="YouTube URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            fullWidth
            size="small"
          />
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            onAddYouTube(youtubeUrl);
            setYoutubeUrl('');
          }}
        >
          Add
        </Button>
        <Button
          variant="contained"
          component="label"
        >
          Add File
          <input
            type="file"
            accept="audio/*"
            onChange={onAddFile}
            hidden
          />
        </Button>
      </Box>
    </Paper>
  );
};

export default TrackList;
