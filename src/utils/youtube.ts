import axios from 'axios';

// Convert ISO 8601 duration to seconds
export const parseDuration = (duration: string): number => {
  const matches = duration.match(/[0-9]+[YMDHMS]/g) || [];
  const factors = {
    Y: 31536000,
    M: 2592000,
    D: 86400,
    H: 3600,
    m: 60,
    S: 1
  };
  
  return matches.reduce((total, part) => {
    const value = parseInt(part.slice(0, -1));
    const unit = part.slice(-1);
    return total + (value * (factors[unit] || 0));
  }, 0);
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
    // Get both video details and content details in one request
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`
    );

    const item = response.data.items[0];
    if (!item) {
      throw new Error('Video not found');
    }

    return {
      name: item.snippet.title,
      duration: parseDuration(item.contentDetails.duration),
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
};

export const validateYouTubeUrl = (url: string): string | null => {
  const pattern = /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\s]{11})/;
  const matches = url.match(pattern);
  return matches ? matches[1] : null;
};
