import React, { useState, useEffect } from 'react';
import { useAppwrite } from '../contexts/AppwriteContext';
import { RealtimeQueueProvider, useRealtimeQueue } from '../contexts/AppwriteContext';
import { usePlaylistManager } from '../hooks/usePlaylistManager';
import { SearchInterface } from './SearchInterface';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { youtubeQuota } from '../services/youtubeQuota';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface QuotaUsage {
  used: number;
  limit: number;
  percentage: number;
  lastUpdated: string;
}

const AdminConsoleContent: React.FC = () => {
  const { isAuthenticated, login, logout, role } = useAppwrite();
  const { queue } = useRealtimeQueue();
  const { removeTrack } = usePlaylistManager();
  const [email, setEmail] = useState('');
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage>({
    used: 0,
    limit: 10000,
    percentage: 0,
    lastUpdated: '',
  });
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Open on mount

  // Load quota on mount
  useEffect(() => {
    if (isAuthenticated) {
      handleRefreshQuota();
    }
  }, [isAuthenticated]);

  const handleRefreshQuota = async () => {
    setQuotaLoading(true);
    try {
      const usage = await youtubeQuota.checkQuotaUsage();
      setQuotaUsage(usage);
    } catch (error) {
      console.error('Failed to fetch quota usage:', error);
      setQuotaUsage({
        used: 0,
        limit: 10000,
        percentage: 0,
        lastUpdated: 'Error fetching quota',
      });
    } finally {
      setQuotaLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white text-center">DJAMMS Admin Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h2 className="text-xl text-white text-center">Login Required</h2>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            <Button
              onClick={() => login(email)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Send Magic Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-slate-900 text-white backdrop-blur-md max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">DJAMMS Admin</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 p-6">
          {/* Top Section: Role Badge + Invite Form */}
          <Card className="bg-slate-800 border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="text-white">
                  {role}
                </Badge>
                <Button
                  onClick={logout}
                  variant="destructive"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
              {role === 'owner' && (
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Staff email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                  <Button
                    onClick={() => {
                      // TODO: Implement staff invite
                      toast.info('Staff invite not implemented yet');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Invite Staff
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Middle Section: Embedded SearchInterface */}
          <Card className="bg-slate-800 border-slate-600">
            <CardContent className="p-6">
              <SearchInterface />
            </CardContent>
          </Card>

          {/* Bottom Section: Queue ScrollArea */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white">Queue ({queue.length} tracks)</CardTitle>
            </CardHeader>
            <CardContent>
              {queue.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {queue.map((track) => (
                      <div key={track.id} className="flex items-center justify-between bg-slate-700 rounded p-3 border border-slate-600 group hover:scale-105 transition-shadow drop-shadow-lg hover:border-amber-400">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-white truncate block">{track.title}</span>
                          <Badge
                            data-testid="priority-badge"
                            variant="secondary"
                            className={`mt-1 ${
                              track.priority === 'high' ? 'bg-red-500' :
                              track.priority === 'normal' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          >
                            {track.priority}
                          </Badge>
                        </div>
                        {role === 'owner' && (
                          <Button
                            onClick={() => {
                              removeTrack(track.id);
                              toast.success(`Removed "${track.title}" from queue`);
                            }}
                            variant="destructive"
                            size="sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-slate-400 text-center py-8">Queue is empty</p>
              )}
            </CardContent>
          </Card>

          {/* Quota Card */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white">YouTube API Quota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={quotaUsage.percentage}
                className={`w-full ${quotaUsage.percentage >= 80 ? 'text-red-500' : ''}`}
              />
              <div className="flex justify-between text-sm text-slate-300">
                <span>Usage: {quotaUsage.used.toLocaleString()} / {quotaUsage.limit.toLocaleString()}</span>
                <span>{quotaUsage.percentage.toFixed(1)}%</span>
              </div>
              <Button
                onClick={handleRefreshQuota}
                size="sm"
                variant="outline"
                disabled={quotaLoading}
              >
                {quotaLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
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