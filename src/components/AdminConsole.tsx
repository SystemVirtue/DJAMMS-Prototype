import React, { useState } from 'react';
import { useAppwrite } from '../contexts/AppwriteContext';
import { RealtimeQueueProvider, useRealtimeQueue } from '../contexts/AppwriteContext';
import { usePlaylistManager } from '../hooks/usePlaylistManager';
import { useVideoSearch } from '../hooks/useVideoSearch';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
}

const AdminConsoleContent: React.FC = () => {
  const { isAuthenticated, login, logout, role } = useAppwrite();
  const { queue } = useRealtimeQueue();
  const { addTrack, removeTrack } = usePlaylistManager();
  const { searchResults, loading: searchLoading, error: searchError, searchYouTube, clearResults } = useVideoSearch();
  const [email, setEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchYouTube(searchQuery);
    }
  };

  const handleAddTrack = async () => {
    if (!selectedVideo) return;

    try {
      await addTrack({
        id: selectedVideo.id,
        title: selectedVideo.title,
        url: `https://www.youtube.com/watch?v=${selectedVideo.id}`,
        priority,
      });
      setSelectedVideo(null);
      setSearchQuery('');
      clearResults();
      alert('Track added successfully!');
    } catch (error) {
      console.error('Error adding track:', error);
      alert('Error adding track');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">DJAMMS Admin Console</h1>
        <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl mb-4">Login Required</h2>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded mb-4 text-white"
          />
          <button
            onClick={() => login(email)}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Send Magic Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">DJAMMS Admin Console</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300">Role: {role}</span>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {role === 'owner' && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl mb-4">Invite Staff</h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Staff email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
            />
            <button
              onClick={() => {
                // TODO: Implement staff invite
                alert('Staff invite not implemented yet');
              }}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Invite Staff
            </button>
          </div>
        </div>
      )}

      {/* Add Track Form */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl mb-4">Add Track</h2>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search YouTube..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 rounded text-white"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className={`p-3 rounded cursor-pointer border-2 ${
                    selectedVideo?.id === video.id
                      ? 'border-blue-500 bg-gray-600'
                      : 'border-gray-600 bg-gray-700 hover:bg-gray-650'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-16 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{video.title}</p>
                      <p className="text-gray-400 text-sm">{video.channelTitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchError && (
            <p className="text-red-400 text-sm">{searchError}</p>
          )}

          {/* Priority Selection */}
          {selectedVideo && (
            <div className="space-y-4">
              <div>
                <p className="text-white mb-2">Selected: {selectedVideo.title}</p>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'high' | 'normal' | 'low')}
                  className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                >
                  <option value="high">High Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <button
                onClick={handleAddTrack}
                className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
              >
                Add to Queue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue Management */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl mb-4">Queue Management ({queue.length} tracks)</h2>
        {queue.length > 0 ? (
          <div className="space-y-2">
            {queue.map((track) => (
              <div key={track.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
                <div>
                  <span className="font-medium">{track.title}</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    track.priority === 'high' ? 'bg-red-600' :
                    track.priority === 'normal' ? 'bg-yellow-600' : 'bg-green-600'
                  }`}>
                    {track.priority}
                  </span>
                </div>
                {role === 'owner' && (
                  <button
                    onClick={() => removeTrack(track.id)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Queue is empty</p>
        )}
      </div>
    </div>
  );
};

const AdminConsole: React.FC = () => {
  return (
    <RealtimeQueueProvider venueId="venue1">
      <AdminConsoleContent />
    </RealtimeQueueProvider>
  );
};

export default AdminConsole;