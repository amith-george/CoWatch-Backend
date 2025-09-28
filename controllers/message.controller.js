// models/controllers/message.controller.js

const Message = require('../models/message.model');

// Save messages in a room
exports.saveMessage = async (req, res) => {
  try {
    const { roomId, senderName, content } = req.body;

    if (!roomId || !senderName || !content) {
      return res.status(400).json({ message: 'roomId, senderName, and content are required.' });
    }

    const message = new Message({
      roomId,
      senderName,
      content,
    });

    await message.save();
    return res.status(201).json({ message: 'Message saved successfully', data: message });
  } catch (error) {
    console.error('Error saving message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all messages for a specific room
exports.getMessagesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ message: 'roomId is required' });
    }
    const storedMessages = await Message.find({ roomId }).sort({ sentAt: 1 }).lean();

    return res.status(200).json({ messages: storedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete all messages for a room
exports.deleteMessagesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const result = await Message.deleteMany({ roomId });
    return res.status(200).json({ message: 'Messages deleted', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};