// Local database search service (placeholder)
export const localSearch = async (query: string) => {
  // Mock API call to local DB
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Local search failed');
  }
  const data = await response.json();

  // Transform to match YouTubeVideo interface
  return data.results.map((item: { videoId: string; title: string; thumbnail: string; channelTitle: string; duration?: string }) => ({
    id: item.videoId,
    title: item.title,
    thumbnail: item.thumbnail,
    channelTitle: item.channelTitle,
    duration: item.duration || 'Unknown',
  }));
};