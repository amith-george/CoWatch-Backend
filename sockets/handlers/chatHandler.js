// sockets/handlers/chatHandler.js

const { queueMessage } = require('../../tasks/messageQueue');

// --- 1. Accept 'rooms' as an argument ---
module.exports = (io, socket, rooms) => {
  const handleChatMessage = ({ roomId, text, username }) => {
    const sender = rooms[roomId]?.[socket.userId];
    const role = sender ? sender.role : 'Participant'; // Fallback role

    if (!sender) {
      console.warn(`Could not find user with socket.userId: ${socket.userId} in room: ${roomId}`);
    }
    
    const message = {
      roomId,
      senderName: username,
      senderRole: role, // <-- 3. Add the role to the message object
      content: text,
      sentAt: new Date(),
    };

    queueMessage(roomId, message);
    
    io.to(roomId).emit('chatMessage', { username, text, role });
  };

  socket.on('chatMessage', handleChatMessage);
};