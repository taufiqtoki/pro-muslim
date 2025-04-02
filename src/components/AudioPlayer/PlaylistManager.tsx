import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  MenuItem,
  Menu,
  Tooltip,
  ListItemButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { Playlist } from '../../types/playlist';

interface PlaylistManagerProps {
  playlists: Playlist[];
  currentPlaylistId: string;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: (name: string, type: string, youtubeUrl?: string) => Promise<void>;
  onImportYouTubePlaylist: (url: string) => Promise<void>;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onRenamePlaylist: (playlistId: string, newName: string) => Promise<void>;
  importLoading: boolean;
  importProgress: { current: number; total: number };
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  playlists,
  currentPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onImportYouTubePlaylist,
  onDeletePlaylist,
  onRenamePlaylist,
  importLoading,
  importProgress
}) => {
  const [newPlaylistDialog, setNewPlaylistDialog] = useState(false);
  const [youtubePlaylistDialog, setYoutubePlaylistDialog] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [editingPlaylistName, setEditingPlaylistName] = useState<string | null>(null);
  const [newPlaylistData, setNewPlaylistData] = useState({ name: '', type: 'custom' as const, youtubeUrl: '' });
  const [playlistMenu, setPlaylistMenu] = useState<null | HTMLElement>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const handlePlaylistMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, playlistId: string) => {
    setPlaylistMenu(event.currentTarget);
    setSelectedPlaylistId(playlistId);
  };

  const handlePlaylistMenuClose = () => {
    setPlaylistMenu(null);
    setSelectedPlaylistId(null);
  };

  const handleCreatePlaylist = async () => {
    try {
      await onCreatePlaylist(
        newPlaylistData.name,
        newPlaylistData.type,
        newPlaylistData.youtubeUrl
      );
      setNewPlaylistDialog(false);
      setNewPlaylistData({ name: '', type: 'custom', youtubeUrl: '' });
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  const handleImportYouTubePlaylist = async () => {
    if (!playlistUrl.trim()) return;
    
    try {
      await onImportYouTubePlaylist(playlistUrl);
      setYoutubePlaylistDialog(false);
      setPlaylistUrl('');
    } catch (error) {
      console.error('Failed to import YouTube playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await onDeletePlaylist(playlistId);
      handlePlaylistMenuClose();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  const handleRenamePlaylist = async (playlistId: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      await onRenamePlaylist(playlistId, newName);
      setEditingPlaylistName(null);
      handlePlaylistMenuClose();
    } catch (error) {
      console.error('Failed to rename playlist:', error);
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Playlists</Typography>
        <Box>
          <Tooltip title="Create new playlist">
            <IconButton onClick={() => setNewPlaylistDialog(true)} size="small">
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Import YouTube playlist">
            <IconButton onClick={() => setYoutubePlaylistDialog(true)} size="small">
              <PlaylistAddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <List dense>
        {playlists.map((playlist) => (
          <ListItemButton
            key={playlist.id}
            selected={playlist.id === currentPlaylistId}
            onClick={() => onSelectPlaylist(playlist.id)}
            sx={{ 
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
              },
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <ListItemText
              primary={
                editingPlaylistName === playlist.id ? (
                  <TextField
                    size="small"
                    value={playlist.name}
                    onChange={(e) => {
                      const updatedPlaylists = playlists.map(p => 
                        p.id === playlist.id ? { ...p, name: e.target.value } : p
                      );
                    }}
                    onBlur={() => handleRenamePlaylist(playlist.id, playlist.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenamePlaylist(playlist.id, playlist.name);
                      }
                    }}
                    autoFocus
                    fullWidth
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  playlist.name
                )
              }
              secondary={`${playlist.tracks?.length || 0} tracks`}
            />
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handlePlaylistMenuOpen(e as React.MouseEvent<HTMLButtonElement>, playlist.id);
              }}
              sx={{ ml: 1 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}
      </List>

      {/* Playlist Options Menu */}
      <Menu
        anchorEl={playlistMenu}
        open={Boolean(playlistMenu)}
        onClose={handlePlaylistMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedPlaylistId) {
            setEditingPlaylistName(selectedPlaylistId);
            handlePlaylistMenuClose();
          }
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedPlaylistId) {
            handleDeletePlaylist(selectedPlaylistId);
          }
        }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* New Playlist Dialog */}
      <Dialog open={newPlaylistDialog} onClose={() => setNewPlaylistDialog(false)}>
        <DialogTitle>Create New Playlist</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Playlist Name"
            fullWidth
            value={newPlaylistData.name}
            onChange={(e) => setNewPlaylistData(prev => ({ ...prev, name: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPlaylistDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreatePlaylist} 
            disabled={!newPlaylistData.name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* YouTube Playlist Import Dialog */}
      <Dialog open={youtubePlaylistDialog} onClose={() => setYoutubePlaylistDialog(false)}>
        <DialogTitle>Import YouTube Playlist</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="YouTube Playlist URL"
            fullWidth
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=..."
          />
          {importLoading && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Importing {importProgress.current} of {importProgress.total} tracks...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYoutubePlaylistDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleImportYouTubePlaylist} 
            disabled={!playlistUrl.trim() || importLoading}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlaylistManager; 