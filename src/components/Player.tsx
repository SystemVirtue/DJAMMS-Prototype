import React, { useEffect } from 'react';
import { RealtimeQueueProvider, useRealtimeQueue } from '../contexts/AppwriteContext';
import { usePlayerManager } from '../hooks/usePlayerManager';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Play, Pause, SkipForward } from 'lucide-react';

const Marquee: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  return (
    <div className={`whitespace-nowrap animate-marquee w-full ${className}`}>
      <div className="text-amber-400 font-semibold text-lg">
        {text}
      </div>
    </div>
  );
};

const PlayerContent: React.FC = () => {
  const { queue } = useRealtimeQueue();
  const { playerState, play, pause, nextTrack, playTrack, setCurrentVideoId } = usePlayerManager();

  const currentTrack = queue.length > 0 ? queue[0] : null;

  useEffect(() => {
    if (queue.length > 0) {
      const videoId = queue[0].id;
      setCurrentVideoId(videoId);
      if (!playerState.isPlaying) {
        playTrack(videoId);
      }
    } else {
      setCurrentVideoId(null);
    }
  }, [queue, setCurrentVideoId, playerState.isPlaying, playTrack]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="flex flex-col items-center gap-4">
        {/* Header: Marquee for current track title */}
        <div className="w-full">
          <Marquee
            text={currentTrack ? currentTrack.title : 'No track playing'}
          />
        </div>

        {/* Central Card: YouTube iframe */}
        <Card className="w-full max-w-4xl bg-slate-800 border-slate-600">
          <CardContent className="p-4">
            {playerState.currentVideoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${playerState.currentVideoId}?autoplay=1&controls=1&rel=0`}
                title="YouTube Player"
                className="w-full aspect-video rounded-lg shadow-xl"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              <div className="w-full aspect-video rounded-lg bg-slate-700 flex items-center justify-center">
                <p className="text-slate-400">No track playing</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Below: Controls row */}
        <div className="flex gap-2">
          <Button
            onClick={play}
            variant="ghost"
            className="bg-blue-600 hover:bg-slate-700 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Play
          </Button>
          <Button
            onClick={pause}
            variant="ghost"
            className="bg-red-600 hover:bg-slate-700 flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
          <Button
            onClick={nextTrack}
            variant="ghost"
            className="bg-green-600 hover:bg-slate-700 flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Next
          </Button>
        </div>

        {/* Queue Accordion */}
        <Card className="w-full max-w-4xl bg-slate-800 border-slate-600">
          <CardContent className="p-4">
            <Accordion data-testid="queue" type="single" collapsible className="w-full">
              {queue.map((track, index) => (
                <AccordionItem key={track.id} value={`item-${index}`}>
                  <AccordionTrigger className="text-white hover:text-amber-400">
                    {track.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex items-center gap-2">
                      <Badge
                        data-testid="priority-badge"
                        variant="secondary"
                        className={
                          track.priority === 'high' ? 'bg-red-500' :
                          track.priority === 'normal' ? 'bg-yellow-500' : 'bg-green-500'
                        }
                      >
                        {track.priority}
                      </Badge>
                      <span className="text-slate-400">Priority track</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
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