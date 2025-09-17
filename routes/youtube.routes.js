const express = require('express');
const router = express.Router();
const { getPopular, searchVideos, getMetadata, getVideoById } = require('../controllers/youtube.controller');

// Route to get the most popular videos in the US
router.get('/popular', getPopular);

// Route to search for videos
router.get('/search', searchVideos);

// Route to get video metadata
router.post('/metadata', getMetadata);

// Get video by ID
router.get('/video/:id', getVideoById);


module.exports = router;
