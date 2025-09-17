const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');

// POST /messages — Save a new message
router.post('/save', messageController.saveMessage);

// GET /messages/:roomId — Fetch all messages for a room
router.get('/:roomId', messageController.getMessagesByRoom);

// DELETE /messages/:roomId — Delete all messages for a room (optional)
router.delete('/:roomId', messageController.deleteMessagesByRoom);

module.exports = router;
