// controllers/twitch.controller.js

const axios = require('axios');

// Extracts the channel name from a Twitch URL
function extractChannelName(url) {
  const regex = /twitch\.tv\/([a-zA-Z0-9_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Helper function to get a fresh access token
const getAccessToken = async () => {
  const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error('Twitch API credentials are not configured.');
  }
  const authUrl = `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`;
  const { data } = await axios.post(authUrl);
  return data.access_token;
};


// Fetches metadata for a given Twitch video URL
exports.getMetadata = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'A Twitch URL is required.' });
    }

    const channelName = extractChannelName(url);
    if (!channelName) {
      return res.status(400).json({ message: 'Invalid Twitch URL format.' });
    }

    const accessToken = await getAccessToken();

    const apiUrl = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;
    const { data: streamData } = await axios.get(apiUrl, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const liveStream = streamData.data[0];

    // If the stream is not live, we fetch channel info as a fallback
    if (!liveStream) {
       const userApiUrl = `https://api.twitch.tv/helix/users?login=${channelName}`;
       const { data: userData } = await axios.get(userApiUrl, {
         headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
         },
       });
       const user = userData.data[0];
       if (!user) {
         return res.status(404).json({ message: 'Twitch channel not found.' });
       }
       return res.status(200).json({
         videoUrl: url,
         title: `(Offline) ${user.display_name}`,
         thumbnailUrl: user.offline_image_url || user.profile_image_url,
         channelTitle: user.display_name,
         isLive: false,
       });
    }
    
    // If the stream is live, format the data
    const formattedMetadata = {
      videoUrl: url,
      title: liveStream.title,
      thumbnailUrl: liveStream.thumbnail_url.replace('{width}', '480').replace('{height}', '270'),
      channelTitle: liveStream.user_name,
      game: liveStream.game_name,
      isLive: true,
    };

    res.status(200).json(formattedMetadata);

  } catch (error) {
    console.error('Error fetching Twitch metadata:', error.message);
    
    // Check for 403 Forbidden error
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ message: 'Request blocked. Your network may be preventing access to the Twitch API.' });
    }
    // Generic error for all other cases
    res.status(500).json({ message: 'Failed to fetch Twitch metadata.' });
  }
};


// Fetches the most popular live streams from Twitch.
exports.getPopularStreams = async (req, res) => {
    try {
      const accessToken = await getAccessToken();
      const apiUrl = `https://api.twitch.tv/helix/streams?first=20`;
  
      const { data } = await axios.get(apiUrl, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
  
      const formattedStreams = data.data.map(stream => ({
        videoUrl: `https://www.twitch.tv/${stream.user_login}`,
        title: stream.title,
        thumbnailUrl: stream.thumbnail_url.replace('{width}', '480').replace('{height}', '270'),
        channelTitle: stream.user_name,
        isLive: true,
      }));
  
      res.status(200).json(formattedStreams);
    } catch (error) {
      console.error('Error fetching popular Twitch streams:', error.message);

      // Check for 403 Forbidden error
      if (error.response && error.response.status === 403) {
        return res.status(403).json({ message: 'Request blocked. Your network may be preventing access to the Twitch API.' });
      }
      // Generic error for all other cases
      res.status(500).json({ message: 'Failed to fetch popular Twitch streams.' });
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
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
  
      const formattedChannels = data.data.map(channel => ({
        videoUrl: `https://www.twitch.tv/${channel.broadcaster_login}`,
        title: channel.is_live ? channel.title : `(Offline) ${channel.display_name}`,
        thumbnailUrl: channel.thumbnail_url.replace('{width}', '480').replace('{height}', '270'),
        channelTitle: channel.display_name,
        isLive: channel.is_live,
      }));
  
      res.status(200).json(formattedChannels);
    } catch (error) {
      console.error('Error searching Twitch channels:', error.message);

      // Check for 403 Forbidden error
      if (error.response && error.response.status === 403) {
        return res.status(403).json({ message: 'Request blocked. Your network may be preventing access to the Twitch API.' });
      }
      // Generic error for all other cases
      res.status(500).json({ message: 'Failed to search Twitch channels.' });
    }
  };