import React, { useEffect, useLayoutEffect } from 'react';
import { RealtimeQueueProvider, useRealtimeQueue } from '../contexts/AppwriteContext';
import { usePlayerManager } from '../hooks/usePlayerManager';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import ErrorBoundary from './ErrorBoundary';

const Marquee: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  return (
    <div className={`whitespace-nowrap animate-marquee w-full ${className}`}>
      <span data-testid="marquee-text" className="text-2xl font-bold text-amber-400">
        {text}
      </span>
    </div>
  );
};

const KioskEmbedContent: React.FC = () => {
  const { queue } = useRealtimeQueue();
  const { playerState, playTrack, setCurrentVideoId } = usePlayerManager();

  const currentTrack = queue.length > 0 ? queue[0] : null;

  useEffect(() => {
    const requestFullscreen = async () => {
      try {
        if (document.fullscreenElement === null && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.warn('Fullscreen request failed:', error);
      }
    };
    requestFullscreen();
  }, []);

  // Defer all updates to post-render with useLayoutEffect and setTimeout
  useLayoutEffect(() => {
    const updatePlayer = () => {
      if (queue.length > 0) {
        const videoId = queue[0].id;
        setTimeout(() => setCurrentVideoId(videoId), 0);
        if (!playerState.isPlaying) {
          setTimeout(() => playTrack(videoId), 0);
        }
      } else {
        setTimeout(() => setCurrentVideoId(null), 0);
      }
      console.log('KioskEmbed queue:', queue);
    };

    updatePlayer();
  }, [queue.length]); // Length only

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-0 overflow-hidden">
      <div className="flex-1 flex items-center justify-center">
        <Marquee text={currentTrack ? currentTrack.title : 'No track playing'} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        {playerState.currentVideoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${playerState.currentVideoId}?autoplay=1&controls=0&rel=0&modestbranding=1&showinfo=0`}
            title="YouTube Player"
            className="h-full w-full border-none"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div className="h-full w-full bg-slate-800 flex items-center justify-center">
            <p className="text-slate-400 text-2xl">No track playing</p>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <h3 className="text-white text-lg font-semibold p-4">Up Next</h3>
        <ScrollArea className="flex-1 p-4">
          <div data-testid="up-next" className="space-y-2">
            {queue.slice(1).map((track, index) => (
              <Card key={track.id || `track-${index}`} data-testid="up-next-item" className="bg-slate-800 border-slate-600">
                <CardContent className="p-3 flex items-center gap-3">
                  <img
                    src={`https://img.youtube.com/vi/${track.id}/default.jpg`}
                    alt={track.title}
                    className="w-16 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    <Badge
                      key={`badge-${track.id}-${track.priority}`}
                      data-testid="priority-badge"
                      variant="secondary"
                      className={
                        track.priority === 'high' ? 'bg-red-500' :
                        track.priority === 'normal' ? 'bg-yellow-500' : 'bg-green-500'
                      }
                    >
                      {track.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {queue.length <= 1 && (
              <div className="text-center py-8">
                <p className="text-slate-400">No upcoming tracks</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const KioskEmbed: React.FC = () => {
  return (
    <RealtimeQueueProvider venueId="venue1">
      <ErrorBoundary>
        <KioskEmbedContent />
      </ErrorBoundary>
    </RealtimeQueueProvider>
  );
};

export default KioskEmbed;