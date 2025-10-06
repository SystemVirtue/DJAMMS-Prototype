import { useState } from 'react';
import { youtubeQuota } from '../services/youtubeQuota';
import { localSearch } from '../services/localSearch';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: { default: { url: string } };
    channelTitle: string;
  };
}

interface YouTubeVideoDetailsItem {
  id: string;
  contentDetails: { duration: string };
}

export const useVideoSearch = () => {
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchYouTube = async (query: string): Promise<YouTubeVideo[]> => {
    if (!query.trim()) return [];

    setLoading(true);
    setError(null);

    try {
      if (import.meta.env.VITE_LOCAL_DB === 'true') {
        const results = await localSearch(query);
        setSearchResults(results);
        return results;
      } else {
        // Existing YouTube search logic
        const apiKey = youtubeQuota.getCurrentKey();
        if (!apiKey) {
          throw new Error('No YouTube API key available');
        }

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`
        );

        if (!response.ok) {
          throw new Error('YouTube search failed');
        }

        const data = await response.json();

        // Get video details for duration
        const videoIds = data.items.map((item: YouTubeSearchItem) => item.id.videoId).join(',');
        const detailsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
        );

        const detailsData = await detailsResponse.json();

        const results: YouTubeVideo[] = data.items.map((item: YouTubeSearchItem, index: number) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.default.url,
          channelTitle: item.snippet.channelTitle,
          duration: (detailsData.items[index] as YouTubeVideoDetailsItem)?.contentDetails?.duration || 'Unknown'
        }));

        setSearchResults(results);
        return results;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setSearchResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
    setError(null);
  };

  return {
    searchResults,
    loading,
    error,
    searchYouTube,
    clearResults
  };
};