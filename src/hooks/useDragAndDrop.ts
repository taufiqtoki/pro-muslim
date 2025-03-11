import { useState, DragEvent } from 'react';

export const useDragAndDrop = () => {
  const [isDragging, setIsDragging] = useState(false);

  const isYouTubeUrl = (text: string) => {
    return text.includes('youtube.com') || text.includes('youtu.be');
  };

  const extractYouTubeUrls = (text: string): string[] => {
    const urls = text.match(/(youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+)/g);
    return urls ? urls.map(url => `https://www.${url}`) : [];
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (
    e: DragEvent,
    onFilesDrop: (files: File[]) => void,
    onUrlDrop: (url: string) => void
  ) => {
    e.preventDefault();
    setIsDragging(false);

    // Handle files
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesDrop(files);
      return;
    }

    // Handle text (potential URLs)
    const text = e.dataTransfer.getData('text');
    if (text) {
      const youtubeUrls = extractYouTubeUrls(text);
      if (youtubeUrls.length > 0) {
        // Process each YouTube URL found
        for (const url of youtubeUrls) {
          onUrlDrop(url);
        }
      }
    }
  };

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
