import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useVideoSearch } from '../hooks/useVideoSearch';
import { usePlaylistManager } from '../hooks/usePlaylistManager';
import { toast } from 'sonner';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
}

interface SearchInterfaceProps {
  onVideoSelect?: (video: YouTubeVideo, priority: 'high' | 'normal' | 'low') => void;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({ onVideoSelect }) => {
  const { searchResults, loading: searchLoading, error: searchError, searchYouTube, clearResults } = useVideoSearch();
  const { addTrack } = usePlaylistManager();
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
      toast.success(`Added "${selectedVideo.title}" to queue with ${priority} priority`);
      setSelectedVideo(null);
      setSearchQuery('');
      clearResults();
    } catch (error) {
      console.error('Error adding track:', error);
      toast.error('Error adding track');
    }
  };

  const handleVideoSelect = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    if (onVideoSelect) {
      onVideoSelect(video, priority);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search YouTube..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-12 bg-slate-800/60 backdrop-blur border-slate-600 text-white placeholder-slate-400"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button
          onClick={handleSearch}
          disabled={searchLoading}
          className="h-12 bg-blue-600 hover:bg-blue-700"
        >
          {searchLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <ScrollArea className="h-64 border rounded-md p-2 bg-slate-800/20">
          <div className="space-y-2">
            {searchResults.map((video) => (
              <div
                key={video.id}
                data-testid="search-result"
                onClick={() => handleVideoSelect(video)}
                className={`p-3 rounded cursor-pointer border-2 transition-all duration-200 ${
                  selectedVideo?.id === video.id
                    ? 'border-amber-500 bg-slate-700/80'
                    : 'border-slate-600 bg-slate-800/80 hover:border-amber-500 hover:scale-105'
                }`}
                style={{ filter: "drop-shadow(-2px -2px 5px rgba(0,0,0,0.3))" }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-16 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate text-sm">{video.title}</p>
                    <p className="text-slate-400 text-xs">{video.channelTitle}</p>
                    {video.duration && (
                      <p className="text-slate-300 text-xs">{video.duration}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {searchError && (
        <p className="text-red-400 text-sm">{searchError}</p>
      )}

      {/* Priority Selection and Add Button */}
      {selectedVideo && (
        <div className="space-y-4 p-4 bg-slate-800/40 rounded-lg border border-slate-600">
          <div>
            <p className="text-white mb-2 text-sm">Selected: {selectedVideo.title}</p>
            <Select value={priority} onValueChange={(value: 'high' | 'normal' | 'low') => setPriority(value)}>
              <SelectTrigger data-testid="priority-select" className="w-full bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">High</Badge>
                    Priority
                  </div>
                </SelectItem>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500">Normal</Badge>
                    Priority
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Low</Badge>
                    Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddTrack}
            className="w-full bg-green-600 hover:bg-green-700 h-12"
          >
            Add to Queue
          </Button>
        </div>
      )}
    </div>
  );
};