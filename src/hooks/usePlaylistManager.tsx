import { useState, useEffect, useCallback } from 'react';
import { useAppwrite } from '../contexts/AppwriteContext';
import { useVideoSearch } from './useVideoSearch';
import { toast } from 'sonner';
import { Query } from 'appwrite';

// Global test queue for test mode
let globalTestQueue: Track[] = [];

// Make it accessible globally for test mode
if (typeof window !== 'undefined') {
  (window as any).globalTestQueue = globalTestQueue;
}

// Storage key for cross-tab sync
const TEST_QUEUE_STORAGE_KEY = 'djams-test-queue';

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

  // Check if we're in test mode
  const isTestMode = typeof window !== 'undefined' && window.location.search.includes('test=true');

  // In test mode, always sync with global queue and localStorage
  useEffect(() => {
    if (isTestMode && typeof window !== 'undefined') {
      const syncWithStorage = () => {
        try {
          const stored = localStorage.getItem(TEST_QUEUE_STORAGE_KEY);
          if (stored) {
            const parsedQueue = JSON.parse(stored);
            globalTestQueue = parsedQueue;
            (window as any).globalTestQueue = parsedQueue;
            setQueue([...parsedQueue]);
          }
        } catch (error) {
          console.error('Error syncing test queue from storage:', error);
        }
      };

      // Initial sync
      syncWithStorage();

      // Listen for storage changes (cross-tab sync)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === TEST_QUEUE_STORAGE_KEY) {
          syncWithStorage();
        }
      };

      window.addEventListener('storage', handleStorageChange);

      // Also poll for changes (in case storage event doesn't fire)
      const interval = setInterval(syncWithStorage, 100);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
  }, [isTestMode]);

  // Load queue from Appwrite
  const loadQueue = useCallback(async () => {
    // In test mode, use global test queue
    if (isTestMode) {
      setQueue([...globalTestQueue]);
      return;
    }

    try {
      setLoading(true);
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'queues',
        [Query.equal('venueId', currentVenue)]
      );
      if (response.documents.length > 0) {
        setQueue(response.documents[0]?.queue || []);
      }
    } catch (error) {
      if ((error as any).code === 400) {
        toast.error('Query syntax error—fallback empty queue');
      }
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [databases, currentVenue, isTestMode]);

  // Sort queue by priority (high -> normal -> low)
  const sortQueueByPriority = (tracks: Track[]): Track[] => {
    return [...tracks].sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  // Load global default playlist
  const loadGlobalDefault = useCallback(async () => {
    try {
      const doc = await databases.getDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'playlists',
        'global_default_playlist'
      );
      if (doc.venueId === 'global') {
        const defaultQueue = doc.playlist || [];
        setQueue(defaultQueue);
        localStorage.setItem('djamsQueue', JSON.stringify(defaultQueue));
      }
    } catch (error) {
      console.error('Error loading global default playlist:', error);
      toast.error('Default playlist load failed, empty queue');
    }
  }, [databases]);

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

    // In test mode, update global queue and localStorage
    if (isTestMode && typeof window !== 'undefined') {
      const currentGlobalQueue = (window as any).globalTestQueue || [];
      const newQueue = [...currentGlobalQueue, trackToAdd];
      const sortedQueue = sortQueueByPriority(newQueue);
      (window as any).globalTestQueue = sortedQueue;
      localStorage.setItem(TEST_QUEUE_STORAGE_KEY, JSON.stringify(sortedQueue));
      setQueue(sortedQueue);
      return;
    }

    const newQueue = [...queue, trackToAdd];
    const sortedQueue = sortQueueByPriority(newQueue);
    setQueue(sortedQueue);

    try {
      // Sync to Appwrite
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'queues',
        [Query.equal('venueId', currentVenue)]
      );

      const docId = response.documents.length > 0 ? response.documents[0].$id : 'unique()';
      await databases.updateDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        'queues',
        docId,
        {
          venueId: currentVenue,
          queue: JSON.stringify(sortedQueue),
          updatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error adding track:', error);
      // Handle 400 query syntax error
      if ((error as any).code === 400) {
        toast.error('Query failed: Check SDK version');
        setQueue([]);
      }
      // Revert on error
      setQueue(queue);
    }
  };

  // Remove track from queue
  const removeTrack = async (trackId: string) => {
    // In test mode, update global queue and localStorage
    if (isTestMode && typeof window !== 'undefined') {
      const currentGlobalQueue = (window as any).globalTestQueue || [];
      const newQueue = currentGlobalQueue.filter((track: Track) => track.id !== trackId);
      (window as any).globalTestQueue = newQueue;
      localStorage.setItem(TEST_QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
      setQueue(newQueue);
      return;
    }

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
    // First, check for localStorage queue
    const storedQueue = localStorage.getItem('djamsQueue');
    if (storedQueue) {
      try {
        const parsedQueue = JSON.parse(storedQueue);
        setQueue(parsedQueue);
      } catch (error) {
        console.error('Error parsing stored queue:', error);
      }
    } else if (queue.length === 0) {
      // No local queue, load global default
      loadGlobalDefault();
    } else {
      // Load from Appwrite if no local
      loadQueue();
    }
  }, [currentVenue, loadQueue, loadGlobalDefault, queue.length]);

  return {
    queue,
    loading,
    addTrack,
    removeTrack,
    loadQueue,
  };
};