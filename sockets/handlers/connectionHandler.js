// sockets/handlers/connectionHandler.js

const Room = require('../../models/room.model');
const { handleUserLeave } = require('../roomManager');

module.exports = (io, socket, rooms) => {
  const joinRoom = async ({ roomId, userId, username }) => {
    try {
      socket.join(roomId);
      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit('error', { message: 'Room not found' });

      let role = 'Participant';
      if (room.host.userId === userId) role = 'Host';
      else if (room.moderators.some(mod => mod.userId === userId)) role = 'Moderator';

      if (!rooms[roomId]) rooms[roomId] = {};
      rooms[roomId][userId] = { username, role, socketId: socket.id };

      socket.userId = userId;

      console.log(`${username} (${role}) joined room: ${roomId}`);

      const members = Object.entries(rooms[roomId]).map(([uid, data]) => ({
        userId: uid,
        username: data.username,
        role: data.role,
      }));

      io.to(roomId).emit('userJoined', { userId, username, role });
      io.to(roomId).emit('membersUpdate', { members });
    } catch (error) {
      console.error('Error in joinRoom:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  };

  const leaveRoom = ({ roomId, userId }) => {
    handleUserLeave(io, socket, roomId, userId);
  };

  const disconnect = () => {
    console.log(`Socket disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      const user = Object.entries(rooms[roomId]).find(([, data]) => data.socketId === socket.id);
      if (user) {
        const [userId] = user;
        handleUserLeave(io, socket, roomId, userId);
        break;
      }
    }
  };

  socket.on('joinRoom', joinRoom);
  socket.on('leaveRoom', leaveRoom);
  socket.on('disconnect', disconnect);
};