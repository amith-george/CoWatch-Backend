// sockets/handlers/chatHandler.js

// 🎯 1. Import the Mongoose model directly.
const Message = require('../../models/message.model');

// 🎯 2. The 'saveMessage' function is now inside this file.
async function saveMessage(messageData) {
  try {
    const savedMessage = await Message.create(messageData);
    console.log(`✅ Saved message for room ${messageData.roomId}`);
    return savedMessage;
  } catch (err) {
    console.error(`❌ Error saving message for room ${messageData.roomId}:`, err);
    throw err;
  }
}

module.exports = (io, socket, rooms) => {
  const handleChatMessage = async ({ roomId, text, username, replyTo }) => {
    const sender = rooms[roomId]?.[socket.userId];
    const role = sender ? sender.role : 'Participant';

    if (!sender) {
      console.warn(`Could not find user with socket.userId: ${socket.userId} in room: ${roomId}`);
      return;
    }
    
    const messageData = {
      roomId,
      senderName: username,
      senderRole: role,
      content: text,
      sentAt: new Date(),
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    try {
      // The function call remains the same.
      const savedMessage = await saveMessage(messageData);
      io.to(roomId).emit('chatMessage', savedMessage.toObject());
    } catch (error) {
      console.error('Failed to save and broadcast message:', error);
      socket.emit('chatError', { message: 'Your message could not be sent.' });
    }
  };

  socket.on('chatMessage', handleChatMessage);
};