import axios from 'axios';

// Convert ISO 8601 duration to seconds
export const parseDuration = (duration: string): number => {
    if (!duration) return 0;
    
    // Handle ISO 8601 duration format (PT#H#M#S)
    const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return 0;
    
    const hours = parseInt(matches[1] || '0');
    const minutes = parseInt(matches[2] || '0');
    const seconds = parseInt(matches[3] || '0');
    
    return (hours * 3600) + (minutes * 60) + seconds;
};

export const getVideoDetails = async (videoId: string): Promise<{
    name: string;
    duration: number;
    thumbnail: string;
}> => {
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YouTube API key is missing');
    }

    try {
        const response = await axios.get(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`
        );

        if (!response.data.items?.length) {
            throw new Error('Video not found');
        }

        const item = response.data.items[0];
        const duration = parseDuration(item.contentDetails.duration);
        
        // Log duration for debugging
        console.log('Parsed duration:', {
            raw: item.contentDetails.duration,
            parsed: duration,
            formatted: formatDuration(duration)
        });

        return {
            name: item.snippet.title,
            duration: duration,  // Now returns seconds as a number
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
        };
    } catch (error) {
        console.error('Error fetching video details:', error);
        throw error;
    }
};

// Helper function to format duration for display
export const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const validateYouTubeUrl = (url: string): string | null => {
  const pattern = /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\s]{11})/;
  const matches = url.match(pattern);
  return matches ? matches[1] : null;
};
