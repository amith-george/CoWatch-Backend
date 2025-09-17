const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');

// Create a new room
router.post('/create', roomController.createRoom);

// Get room by ID
router.get('/:roomId', roomController.getRoomById);

// Delete a room
router.delete('/:roomId', roomController.deleteRoom);

// User joins room
router.post('/:roomId/join', roomController.joinRoom);

module.exports = router;
