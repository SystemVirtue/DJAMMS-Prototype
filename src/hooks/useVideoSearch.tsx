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

        // Handle non-OK responses (403/quota, HTML errors) with better diagnostics
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('YouTube search returned 403 — quota exceeded or invalid API key');
          }
          const text = await response.text().catch(() => '');
          // If the API returned HTML (like an error page), surface it in the message
          if (text && text.trim().startsWith('<')) {
            throw new Error(`YouTube search returned non-JSON response: ${text.slice(0, 200)}`);
          }
          throw new Error(`YouTube search failed: ${response.status}`);
        }

        // Ensure response is JSON
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const maybeText = await response.text().catch(() => '');
          throw new Error(`YouTube search returned unexpected content-type: ${contentType} - ${maybeText.slice(0,200)}`);
        }

        const data = await response.json();

        // Get video details for duration
        const videoIds = data.items.map((item: YouTubeSearchItem) => item.id.videoId).join(',');
        const detailsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
        );
        if (!detailsResponse.ok) {
          // fallback to unknown durations if details call fails
          console.warn('YouTube video details fetch failed:', detailsResponse.status);
        }

        const detailsData = await (detailsResponse.ok ? detailsResponse.json() : Promise.resolve({ items: [] }));

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