// controllers/twitch.controller.js

const axios = require('axios');

// Extracts the channel name from a Twitch URL
function extractChannelName(url) {
  const regex = /twitch\.tv\/([a-zA-Z0-9_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Token caching logic remains the same
let tokenCache = { accessToken: null, expiresAt: 0 };
const getAccessToken = async () => { /* ... same as before ... */ };

// ✨ --- NEW HELPER FUNCTION --- ✨
// Centralizes the logic for formatting a Twitch API item into our standard video object.
function formatTwitchChannel(channel) {
  // Handles slight differences between the 'streams' and 'search' API responses.
  const login = channel.user_login || channel.broadcaster_login;
  return {
    videoUrl: `https://www.twitch.tv/${login}`,
    title: channel.is_live ? channel.title : `(Offline) ${channel.display_name}`,
    thumbnailUrl: channel.thumbnail_url.replace('{width}', '480').replace('{height}', '270'),
    channelTitle: channel.display_name || channel.user_name,
    isLive: channel.is_live,
  };
}

// ✨ --- NEW HELPER FUNCTION --- ✨
// Centralizes error handling for API requests.
function handleApiError(res, error, defaultMessage) {
  console.error(error.message);
  if (error.response && error.response.status === 403) {
    return res.status(403).json({ message: 'Request blocked. Your network may be preventing access to the Twitch API.' });
  }
  return res.status(500).json({ message: defaultMessage });
}


// Fetches metadata for a given Twitch video URL
exports.getMetadata = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: 'A Twitch URL is required.' });

    const channelName = extractChannelName(url);
    if (!channelName) return res.status(400).json({ message: 'Invalid Twitch URL format.' });

    const accessToken = await getAccessToken();
    const apiUrl = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;
    const { data: streamData } = await axios.get(apiUrl, {
      headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
    });

    const liveStream = streamData.data[0];

    if (!liveStream) {
       const userApiUrl = `https://api.twitch.tv/helix/users?login=${channelName}`;
       const { data: userData } = await axios.get(userApiUrl, {
         headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
       });
       const user = userData.data[0];
       if (!user) return res.status(404).json({ message: 'Twitch channel not found.' });
       
       return res.status(200).json({
         videoUrl: url,
         title: `(Offline) ${user.display_name}`,
         thumbnailUrl: user.offline_image_url || user.profile_image_url,
         channelTitle: user.display_name,
         isLive: false,
       });
    }
    
    // ✨ Use the helper function for the live stream data.
    const formattedMetadata = formatTwitchChannel(liveStream);
    res.status(200).json(formattedMetadata);

  } catch (error) {
    // ✨ Use the error handling helper.
    handleApiError(res, error, 'Failed to fetch Twitch metadata.');
  }
};


// Fetches the most popular live streams from Twitch.
exports.getPopularStreams = async (req, res) => {
    try {
      const accessToken = await getAccessToken();
      const apiUrl = `https://api.twitch.tv/helix/streams?first=20`;
      const { data } = await axios.get(apiUrl, {
        headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
      });
  
      // ✨ Use the helper function for clean, consistent formatting.
      const formattedStreams = data.data.map(formatTwitchChannel);
  
      res.status(200).json(formattedStreams);
    } catch (error) {
      // ✨ Use the error handling helper.
      handleApiError(res, error, 'Failed to fetch popular Twitch streams.');
    }
  };
  
  
// Searches for Twitch channels based on a query.
exports.searchChannels = async (req, res) => {
    try {
      const { q: query } = req.query;
      if (!query) return res.status(400).json({ message: 'A search query is required.' });
  
      const accessToken = await getAccessToken();
      const apiUrl = `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=20`;
      const { data } = await axios.get(apiUrl, {
        headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
      });
  
      // ✨ Use the helper function here as well.
      const formattedChannels = data.data.map(formatTwitchChannel);
  
      res.status(200).json(formattedChannels);
    } catch (error) {
      // ✨ Use the error handling helper.
      handleApiError(res, error, 'Failed to search Twitch channels.');
    }
  };