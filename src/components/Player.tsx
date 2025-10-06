import React, { useEffect } from 'react';
import { RealtimeQueueProvider, useRealtimeQueue } from '../contexts/AppwriteContext';
import { usePlaylistManager } from '../hooks/usePlaylistManager';
import { usePlayerManager } from '../hooks/usePlayerManager';

const PlayerContent: React.FC = () => {
  const { queue } = useRealtimeQueue();
  const { removeTrack } = usePlaylistManager();
  const { playerState, play, pause, nextTrack, setCurrentVideoId } = usePlayerManager();

  useEffect(() => {
    if (queue.length > 0) {
      const videoId = queue[0].id;
      setCurrentVideoId(videoId);
    } else {
      setCurrentVideoId(null);
    }
  }, [queue, setCurrentVideoId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">DJAMMS Player</h1>

      {/* Current Track Display */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl mb-4">Now Playing</h2>
        {playerState.currentVideoId ? (
          <div className="mb-4">
            <p className="text-gray-300">Playing: {playerState.currentTrack}</p>
            <div className="mt-4 aspect-video bg-gray-700 rounded overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${playerState.currentVideoId}?autoplay=1&controls=1&rel=0`}
                title="YouTube Player"
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No track playing</p>
        )}

        <div className="mt-4">
          <button
            onClick={play}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mr-2"
          >
            Play
          </button>
          <button
            onClick={pause}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded mr-2"
          >
            Pause
          </button>
          <button
            onClick={nextTrack}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Next Track
          </button>
        </div>
      </div>

      {/* Queue Display */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl mb-4">Queue ({queue.length} tracks)</h2>
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
                <button
                  onClick={() => removeTrack(track.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Remove
                </button>
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

const Player: React.FC = () => {
  return (
    <RealtimeQueueProvider venueId="venue1">
      <PlayerContent />
    </RealtimeQueueProvider>
  );
};

export default Player;