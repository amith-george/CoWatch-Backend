const Message = require('../models/message.model');
const { getQueuedMessages } = require('../tasks/messageQueue');
// Save a message to the database
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

    const storedMessages = await Message.find({ roomId }).sort({ sentAt: 1 });
    const queuedMessages = getQueuedMessages(roomId);

    // Combine and map messages to the format the frontend expects
    const combinedMessages = [...storedMessages, ...queuedMessages]
      .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
      .map(msg => ({
        // Use ._doc to get a plain object if msg is a Mongoose document
        ...(msg._doc || msg), 
        username: msg.senderName,
        text: msg.content,
        role: msg.senderRole, // <-- Map senderRole to role
      }));

    return res.status(200).json({ messages: combinedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete all messages for a room (useful when a room expires or is deleted)
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
