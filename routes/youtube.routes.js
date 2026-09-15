const express = require('express');
const router = express.Router();
const { getPopular, searchVideos, getMetadata, getVideoById } = require('../controllers/youtube.controller');
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { message: "Too many search requests from this IP, please try again later." }
});

router.use(apiLimiter);

// Route to get the most popular videos in the US
router.get('/popular', getPopular);

// Route to search for videos
router.get('/search', searchVideos);

// Route to get video metadata
router.post('/metadata', getMetadata);

// Get video by ID
router.get('/video/:id', getVideoById);


module.exports = router;
