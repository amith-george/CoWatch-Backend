const axios = require('axios');

// Converting videoId into a proper videoURL
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Fetches the most popular videos from YouTube.
 */
exports.getPopular = async (req, res) => {
  try {
    const API_KEY = process.env.YOUTUBE_CONNECT;
    if (!API_KEY) throw new Error('YouTube API key is not configured.');

    // --- Added 'contentDetails' to the 'part' parameter ---
    const URL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=US&maxResults=20&key=${API_KEY}`;
    const { data } = await axios.get(URL);

    const formattedVideos = data.items.map(item => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
      // --- Added age-restriction check ---
      isAgeRestricted: item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
    }));

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

    // First, get the video IDs from the search query
    const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=20&type=video&key=${API_KEY}`;
    const { data: searchData } = await axios.get(searchURL);
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    if (!videoIds) {
      return res.status(200).json([]);
    }

    // Now, fetch video details, including contentDetails
    const detailsURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${API_KEY}`;
    const { data: detailsData } = await axios.get(detailsURL);

    const formattedResults = detailsData.items.map(item => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
      // --- Added age-restriction check ---
      isAgeRestricted: item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
    }));

    res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Error searching videos:', error.message);
    res.status(500).json({ message: 'Failed to search videos.' });
  }
};

/**
 * --- NEW FUNCTION ---
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

    // --- Added 'contentDetails' to the 'part' parameter ---
    const URL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`;
    const { data } = await axios.get(URL);

    const metadataMap = new Map(data.items.map(item => [item.id, item]));

    const formattedMetadata = videoIds.map(id => {
      const item = metadataMap.get(id);
      if (!item) return null;

      return {
        videoId: id,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        videoUrl: `https://www.youtube.com/watch?v=${id}`,
        // --- Added age-restriction check ---
        isAgeRestricted: item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
      };
    }).filter(item => item);

    res.status(200).json(formattedMetadata);
  } catch (error) {
    console.error('Error fetching video metadata:', error.message);
    res.status(500).json({ message: 'Failed to fetch video metadata.' });
  }
};


/**
 * --- NEW FUNCTION ---
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

    const item = data.items[0];
    const formattedVideo = {
      videoId: item.id,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
      isAgeRestricted: item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
    };

    res.status(200).json(formattedVideo);
  } catch (error) {
    console.error('Error fetching video by ID:', error.message);
    res.status(500).json({ message: 'Failed to fetch video by ID.' });
  }
};