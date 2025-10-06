import { useState, useEffect, useCallback } from 'react';
import { useAppwrite } from '../contexts/AppwriteContext';
import { useVideoSearch } from './useVideoSearch';

interface Track {
  id: string;
  title: string;
  url: string;
  priority: 'high' | 'normal' | 'low';
  index: number;
}

export const usePlaylistManager = () => {
  const { databases, currentVenue } = useAppwrite();
  const [queue, setQueue] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { searchYouTube } = useVideoSearch();

  // Load queue from Appwrite
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'queues',
        [`equal("venueId", "${currentVenue}")`]
      );
      if (response.documents.length > 0) {
        const sortedQueue = sortQueueByPriority(response.documents[0].queue || []);
        setQueue(sortedQueue);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  }, [databases, currentVenue]);

  // Sort queue by priority (high -> normal -> low)
  const sortQueueByPriority = (tracks: Track[]): Track[] => {
    return [...tracks].sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  // Add track to queue
  const addTrack = async (track: Omit<Track, 'index'>) => {
    let trackToAdd = { ...track, index: Date.now() };

    // If no URL provided, search YouTube
    if (!track.url && track.title) {
      try {
        const searchResults = await searchYouTube(track.title);
        if (searchResults.length > 0) {
          const firstResult = searchResults[0];
          trackToAdd = {
            ...trackToAdd,
            id: firstResult.id,
            title: firstResult.title,
            url: `https://www.youtube.com/watch?v=${firstResult.id}`
          };
        } else {
          throw new Error('No YouTube results found');
        }
      } catch (error) {
        console.error('YouTube search error:', error);
        throw new Error('Failed to find YouTube video');
      }
    }

    const newQueue = [...queue, trackToAdd];
    const sortedQueue = sortQueueByPriority(newQueue);
    setQueue(sortedQueue);

    try {
      // Sync to Appwrite
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'queues',
        [`equal("venueId", "${currentVenue}")`]
      );

      const docId = response.documents.length > 0 ? response.documents[0].$id : 'unique()';
      await databases.updateDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'queues',
        docId,
        {
          venueId: currentVenue,
          queue: sortedQueue,
          updatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error adding track:', error);
      // Revert on error
      setQueue(queue);
    }
  };

  // Remove track from queue
  const removeTrack = async (trackId: string) => {
    const newQueue = queue.filter(track => track.id !== trackId);
    setQueue(newQueue);

    try {
      // Sync to Appwrite
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'queues',
        [`equal("venueId", "${currentVenue}")`]
      );

      if (response.documents.length > 0) {
        await databases.updateDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          'queues',
          response.documents[0].$id,
          {
            venueId: currentVenue,
            queue: newQueue,
            updatedAt: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      console.error('Error removing track:', error);
      setQueue(queue);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [currentVenue, loadQueue]);

  return {
    queue,
    loading,
    addTrack,
    removeTrack,
    loadQueue,
  };
};