import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Client, Databases, Account, Query } from 'appwrite';

interface Track {
  id: string;
  title: string;
  url: string;
  priority: 'high' | 'normal' | 'low';
  index: number;
}

interface AppwriteContextType {
  client: Client;
  databases: Databases;
  account: Account;
  currentVenue: string;
  isAuthenticated: boolean;
  role: 'owner' | 'staff' | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAppwrite = () => {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error('useAppwrite must be used within an AppwriteProvider');
  }
  return context;
};

interface RealtimeQueueContextType {
  queue: Track[];
  setQueue: (queue: Track[]) => void;
}

const RealtimeQueueContext = createContext<RealtimeQueueContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useRealtimeQueue = () => {
  const context = useContext(RealtimeQueueContext);
  if (!context) {
    throw new Error('useRealtimeQueue must be used within a RealtimeQueueProvider');
  }
  return context;
};

interface RealtimeQueueProviderProps {
  children: ReactNode;
  venueId: string;
}

export const RealtimeQueueProvider: React.FC<RealtimeQueueProviderProps> = ({ children, venueId }) => {
  const { databases } = useAppwrite();
  const [queue, setQueue] = useState<Track[]>([]);

  // Check if we're in test mode
  const isTestMode = useMemo(() => typeof window !== 'undefined' && window.location.search.includes('test=true'), []);

  // Storage key for cross-tab sync
  const TEST_QUEUE_STORAGE_KEY = 'djams-test-queue';

  useEffect(() => {
    // Define fetchDefaultPlaylist and fetchQueue up-front so test mode can
    // also poll the DB for updates.
    const fetchDefaultPlaylist = async () => {
      try {
        const res = await databases.listDocuments(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          'playlists',
          [Query.equal('name', 'global_default_playlist')]
        );
        if (res.documents.length > 0) {
          const p = res.documents[0] as any;
          const raw = p.tracks ?? p.playlist ?? p.items ?? p.data;
          const tracks = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(tracks)) {
            setTimeout(() => {
              setQueue(prev => {
                try {
                  if (JSON.stringify(prev) !== JSON.stringify(tracks)) return [...tracks];
                } catch (e) {
                  return [...tracks];
                }
                return prev;
              });
            }, 0);
            return true;
          }
        }
      } catch (err) {
        console.error('Error fetching default playlist:', err);
      }
      return false;
    };

    // Define fetchQueue so it can be reused by polling
    const fetchQueue = async () => {
      try {
        const response = await databases.listDocuments(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          'queues',
          [Query.equal('venueId', venueId)]
        );
        if (response.documents.length > 0) {
          const doc = response.documents[0];
          const parsed = typeof doc.queue === 'string' ? JSON.parse(doc.queue) : doc.queue;
          setQueue(Array.isArray(parsed) ? parsed : []);
          return true;
        }
      } catch (error) {
        console.error('Error fetching initial queue:', error);
      }
      return false;
    };

    if (isTestMode && typeof window !== 'undefined') {
      const syncWithStorage = () => {
        try {
          const stored = localStorage.getItem(TEST_QUEUE_STORAGE_KEY);
          if (stored) {
            const parsedQueue = JSON.parse(stored);
            // Defer setQueue to post-render
            setTimeout(() => {
              setQueue(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(parsedQueue)) {
                  return [...parsedQueue];
                }
                return prev;
              });
            }, 0);
          }
        } catch (error) {
          console.error('Error syncing test queue from storage:', error);
        }
      };

      syncWithStorage(); // Initial

      const channel = new BroadcastChannel('djams-test-queue-sync');
      channel.onmessage = (event) => {
        if (event.data.type === 'queue-update') {
          syncWithStorage();
        }
      };

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === TEST_QUEUE_STORAGE_KEY) {
          syncWithStorage();
        }
      };

      window.addEventListener('storage', handleStorageChange);

      // Poll for changes as Playwright creates isolated contexts that don't
      // reliably forward storage events/BroadcastChannel between contexts.
      const interval = setInterval(syncWithStorage, 300);
      const dbPollInterval = setInterval(fetchQueue, 1000);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
        clearInterval(dbPollInterval);
        channel.close();
      };
    }
    (async () => {
      const found = await fetchQueue();
      if (!found) {
        await fetchDefaultPlaylist();
      }

      // Poll the DB for updates every second so separate browser contexts
      // (Playwright test contexts) can observe changes via the DB.
      const dbPollInterval = setInterval(fetchQueue, 1000);

      // Ensure DB polling is cleaned up when effect tears down
      (window as any).__djams_dbPollCleanup = () => clearInterval(dbPollInterval);
    })();
  }, [venueId, databases, isTestMode]);

  const value: RealtimeQueueContextType = {
    queue,
    setQueue,
  };

  return (
    <RealtimeQueueContext.Provider value={value}>
      {children}
    </RealtimeQueueContext.Provider>
  );
};

interface AppwriteProviderProps {
  children: ReactNode;
}

export const AppwriteProvider: React.FC<AppwriteProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<'owner' | 'staff' | null>(null);
  const currentVenue = 'venue1'; // Hardcoded for prototype

  // Initialize Appwrite client
  const { client, databases, account } = useMemo(() => {
    const client = new Client()
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

    const databases = new Databases(client);
    const account = new Account(client);

    return { client, databases, account };
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check for test mode (environment variable or URL parameter)
      const isTestMode = import.meta.env.VITE_TEST_MODE === 'true' ||
        window.location.search.includes('test=true');

      if (isTestMode) {
        // In test mode, automatically authenticate as owner
        setIsAuthenticated(true);
        setRole('owner');
        return;
      }

      try {
        const user = await account.get();
        setIsAuthenticated(true);
        // Fetch user role from users collection
        const userDoc = await databases.getDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          'users',
          user.$id
        );
        setRole(userDoc.role || 'staff'); // Default to staff
      } catch {
        setIsAuthenticated(false);
        setRole(null);
      }
    };
    checkAuth();
  }, [account, databases]);

  const login = async (email: string) => {
    try {
      await account.createMagicURLSession(
        'unique()', // userId - would come from registration
        email
      );
      alert('Check your email for the login link!');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AppwriteContextType = {
    client,
    databases,
    account,
    currentVenue,
    isAuthenticated,
    role,
    login,
    logout,
  };

  return (
    <AppwriteContext.Provider value={value}>
      {children}
    </AppwriteContext.Provider>
  );
};