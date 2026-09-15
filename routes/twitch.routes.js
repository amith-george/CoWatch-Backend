const express = require('express');
const router = express.Router();
const twitchController = require('../controllers/twitch.controller');
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { message: "Too many search requests from this IP, please try again later." }
});

router.use(apiLimiter);

// Get metadata for a single Twitch URL
router.get('/metadata', twitchController.getMetadata);

// Get popular streams
router.get('/popular', twitchController.getPopularStreams);

// Search for channels
router.get('/search', twitchController.searchChannels);


module.exports = router;