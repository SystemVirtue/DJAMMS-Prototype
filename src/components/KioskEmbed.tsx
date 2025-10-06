import React, { useEffect } from 'react';
import { RealtimeQueueProvider, useRealtimeQueue } from '../contexts/AppwriteContext';

const KioskEmbedContent: React.FC = () => {
  const { queue } = useRealtimeQueue();

  useEffect(() => {
    if (document.fullscreenElement === null) {
      document.documentElement.requestFullscreen().catch(console.error);
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement === null) {
        // Optionally handle exit fullscreen
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 text-white">DJAMMS Kiosk</h1>
          <div className="bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl mb-4">Now Playing</h2>
              <div className="bg-gray-700 rounded p-4">
                {queue.length > 0 ? (
                  <div>
                    <p className="text-white font-medium text-lg">{queue[0].title}</p>
                    <div className="mt-4 aspect-video bg-gray-600 rounded flex items-center justify-center">
                      <span className="text-gray-400">YouTube Player</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">No tracks in queue</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xl mb-4">Up Next ({queue.length - 1} tracks)</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {queue.slice(1).map((track) => (
                  <div key={track.id} className="bg-gray-700 rounded p-3">
                    <p className="text-gray-300">{track.title}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                      track.priority === 'high' ? 'bg-red-600' :
                      track.priority === 'normal' ? 'bg-yellow-600' : 'bg-green-600'
                    }`}>
                      {track.priority}
                    </span>
                  </div>
                ))}
                {queue.length <= 1 && (
                  <p className="text-gray-500">No upcoming tracks</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KioskEmbed: React.FC = () => {
  return (
    <RealtimeQueueProvider venueId="venue1">
      <KioskEmbedContent />
    </RealtimeQueueProvider>
  );
};

export default KioskEmbed;