const express = require('express');
const router = express.Router();
const twitchController = require('../controllers/twitch.controller');

// Get metadata for a single Twitch URL
router.get('/metadata', twitchController.getMetadata);

// Get popular streams
router.get('/popular', twitchController.getPopularStreams);

// Search for channels
router.get('/search', twitchController.searchChannels);


module.exports = router;