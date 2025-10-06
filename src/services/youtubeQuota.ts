// YouTube API quota management service
// Adapted from prod-jukebox quota handling

const YOUTUBE_API_KEYS = [
  import.meta.env.VITE_YOUTUBE_API_KEY,
  // Add more keys as needed for quota rotation
];

interface QuotaUsage {
  used: number;
  limit: number;
  percentage: number;
  lastUpdated: string;
}

export class YouTubeQuotaService {
  private keys: string[] = YOUTUBE_API_KEYS;
  private keyIndex: number = 0;

  // Check quota usage for current key
  async checkQuotaUsage(apiKey?: string): Promise<QuotaUsage> {
    const key = apiKey || this.getCurrentKey();
    
    if (!key) {
      return {
        used: 0,
        limit: 10000,
        percentage: 0,
        lastUpdated: 'No API key available',
      };
    }

    try {
      // YouTube Data API v3 quota query
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&q=test&type=video&maxResults=1&key=${key}`
      );

      if (response.status === 403) {
        // Quota exceeded
        return {
          used: 10000,
          limit: 10000,
          percentage: 100,
          lastUpdated: 'Quota exceeded',
        };
      } else if (response.ok) {
        // Assume some usage, in real implementation you'd track actual usage
        const used = Math.floor(Math.random() * 5000); // Mock usage
        return {
          used,
          limit: 10000,
          percentage: (used / 10000) * 100,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        return {
          used: 0,
          limit: 10000,
          percentage: 0,
          lastUpdated: `Error: ${response.status}`,
        };
      }
    } catch (error) {
      console.error('Quota check failed:', error);
      return {
        used: 0,
        limit: 10000,
        percentage: 0,
        lastUpdated: 'Error checking quota',
      };
    }
  }

  // Check quota and rotate key if needed
  async checkQuota(): Promise<boolean> {
    // TODO: Implement actual quota checking
    // For now, rotate keys periodically
    if (Math.random() > 0.8) { // 20% chance to rotate
      await this.rotateKey();
      return true;
    }
    return false;
  }

  // Rotate to next API key
  async rotateKey(): Promise<void> {
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
    console.log(`Rotated to YouTube API key ${this.keyIndex}`);

    // TODO: Update gapi client with new key
    // if (window.gapi?.client?.youtube) {
    //   window.gapi.client.setApiKey(this.keys[this.keyIndex]);
    // }
  }

  // Get current API key
  getCurrentKey(): string {
    return this.keys[this.keyIndex];
  }

  // Get all available keys
  getKeys(): string[] {
    return [...this.keys];
  }
}

export const youtubeQuota = new YouTubeQuotaService();