import React from 'react';
import { IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

interface FavoriteIconComponentProps {
  isFavorite: boolean;
  onClick: () => void;
}

export const FavoriteIconComponent: React.FC<FavoriteIconComponentProps> = ({ 
  isFavorite, 
  onClick 
}) => (
  <IconButton 
    size="small" 
    onClick={onClick}
    sx={{
      '&:hover': {
        color: '#ff69b4', // Pink color on hover
      },
      ...(isFavorite && {
        color: '#ff1493', // Deeper pink when favorited
      })
    }}
  >
    {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
  </IconButton>
);
