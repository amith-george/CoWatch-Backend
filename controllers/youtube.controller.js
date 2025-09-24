// controllers/youtube.controller.js

const axios = require('axios');

// Helper function to extract a video ID from various YouTube URL formats
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// ✨ --- NEW HELPER FUNCTION --- ✨
// Centralizes the logic for formatting a YouTube API item into our standard video object.
function formatYouTubeVideo(item) {
  return {
    videoId: item.id,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails.high.url,
    channelTitle: item.snippet.channelTitle,
    videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
    isAgeRestricted: item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
  };
}

/**
 * Fetches the most popular videos from YouTube.
 */
exports.getPopular = async (req, res) => {
  try {
    const API_KEY = process.env.YOUTUBE_CONNECT;
    if (!API_KEY) throw new Error('YouTube API key is not configured.');

    const URL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=US&maxResults=20&key=${API_KEY}`;
    const { data } = await axios.get(URL);

    // ✨ Use the helper function for clean, consistent formatting.
    const formattedVideos = data.items.map(formatYouTubeVideo);

    res.status(200).json(formattedVideos);
  } catch (error) {
    console.error('Error fetching popular videos:', error.message);
    res.status(500).json({ message: 'Failed to fetch popular videos.' });
  }
};

/**
 * Searches for videos based on a query.
 */
exports.searchVideos = async (req, res) => {
  try {
    const { q: query } = req.query;
    if (!query) return res.status(400).json({ message: 'A search query is required.' });

    const API_KEY = process.env.YOUTUBE_CONNECT;
    if (!API_KEY) throw new Error('YouTube API key is not configured.');

    const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=20&type=video&key=${API_KEY}`;
    const { data: searchData } = await axios.get(searchURL);
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    if (!videoIds) {
      return res.status(200).json([]);
    }

    const detailsURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${API_KEY}`;
    const { data: detailsData } = await axios.get(detailsURL);

    // ✨ Use the helper function here as well.
    const formattedResults = detailsData.items.map(formatYouTubeVideo);

    res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Error searching videos:', error.message);
    res.status(500).json({ message: 'Failed to search videos.' });
  }
};

/**
 * Fetches metadata for a given list of YouTube video URLs.
 */
exports.getMetadata = async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ message: 'An array of URLs is required.' });
    }

    const videoIds = urls.map(extractVideoId).filter(id => id);
    if (videoIds.length === 0) {
      return res.status(200).json([]);
    }

    const API_KEY = process.env.YOUTUBE_CONNECT;
    if (!API_KEY) throw new Error('YouTube API key is not configured.');

    const URL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`;
    const { data } = await axios.get(URL);

    // ✨ Use the helper function for the final mapping.
    const formattedMetadata = data.items.map(formatYouTubeVideo);

    res.status(200).json(formattedMetadata);
  } catch (error) {
    console.error('Error fetching video metadata:', error.message);
    res.status(500).json({ message: 'Failed to fetch video metadata.' });
  }
};


/**
 * Fetches metadata for a single video by its ID.
 */
exports.getVideoById = async (req, res) => {
  try {
    const { id: videoId } = req.params;
    if (!videoId) {
      return res.status(400).json({ message: 'A video ID is required.' });
    }

    const API_KEY = process.env.YOUTUBE_CONNECT;
    if (!API_KEY) throw new Error('YouTube API key is not configured.');

    const URL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`;
    const { data } = await axios.get(URL);

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    // ✨ Use the helper function for a single item.
    const formattedVideo = formatYouTubeVideo(data.items[0]);

    res.status(200).json(formattedVideo);
  } catch (error) {
    console.error('Error fetching video by ID:', error.message);
    res.status(500).json({ message: 'Failed to fetch video by ID.' });
  }
};