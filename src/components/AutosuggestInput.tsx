import React, { useState, useEffect, useRef } from 'react';
import { TextField, Paper, List, ListItem, ClickAwayListener, Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface AutosuggestInputProps {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const AutosuggestInput: React.FC<AutosuggestInputProps> = ({
  suggestions,
  value,
  onChange,
  onSubmit,
  placeholder,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    const filtered = suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions

    setFilteredSuggestions(filtered);
  }, [value, suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    onSubmit(suggestion);
    setIsOpen(false);
  };

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            variant="outlined"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            label={label}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => onSubmit(value)}
            disabled={!value.trim()}
            startIcon={<AddIcon />}
          >
            Add
          </Button>
        </Box>
        {isOpen && filteredSuggestions.length > 0 && (
          <Paper
            sx={{
              position: 'absolute',
              width: '100%',
              mt: 1,
              maxHeight: 200,
              overflow: 'auto',
              zIndex: 1000,
            }}
          >
            <List>
              {filteredSuggestions.map((suggestion, index) => (
                <ListItem
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  {suggestion}
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};
