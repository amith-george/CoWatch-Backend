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

  // ✨ ADD THIS NEW HANDLER
  const handleUpdateUsername = async ({ roomId, userId, newUsername }) => {
    try {
      const trimmedNewUsername = newUsername.trim();
      
      // 1. Basic Validation
      if (!trimmedNewUsername || trimmedNewUsername.length < 2 || trimmedNewUsername.length > 20) {
        return socket.emit('error', { message: 'Username must be between 2 and 20 characters.' });
      }

      // 2. Database Fetch
      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found.' });
      }

      // 3. Uniqueness Check (case-insensitive)
      const isTaken =
        (room.host.userId !== userId && room.host.username.toLowerCase() === trimmedNewUsername.toLowerCase()) ||
        room.moderators.some(m => m.userId !== userId && m.username.toLowerCase() === trimmedNewUsername.toLowerCase()) ||
        room.participants.some(p => p.userId !== userId && p.username.toLowerCase() === trimmedNewUsername.toLowerCase());

      if (isTaken) {
        return socket.emit('error', { message: 'This username is already taken in the room.' });
      }

      // 4. Database Update
      let userFoundAndUpdated = false;
      if (room.host.userId === userId) {
        room.host.username = trimmedNewUsername;
        userFoundAndUpdated = true;
      } else {
        const modIndex = room.moderators.findIndex(m => m.userId === userId);
        if (modIndex > -1) {
          room.moderators[modIndex].username = trimmedNewUsername;
          userFoundAndUpdated = true;
        } else {
          const participantIndex = room.participants.findIndex(p => p.userId === userId);
          if (participantIndex > -1) {
            room.participants[participantIndex].username = trimmedNewUsername;
            userFoundAndUpdated = true;
          }
        }
      }
      
      if (!userFoundAndUpdated) {
        return socket.emit('error', { message: 'User not found in this room.' });
      }
      await room.save();

      // 5. In-Memory State Update
      if (rooms[roomId] && rooms[roomId][userId]) {
        rooms[roomId][userId].username = trimmedNewUsername;
      } else {
        console.warn(`User ${userId} not in memory for room ${roomId} during name update.`);
        return;
      }

      // 6. Broadcast the updated member list to all clients
      const members = Object.entries(rooms[roomId]).map(([uid, data]) => ({
        userId: uid,
        username: data.username,
        role: data.role,
      }));
      io.to(roomId).emit('membersUpdate', { members });
      
      console.log(`User ${userId} in room ${roomId} changed name to ${trimmedNewUsername}`);
    } catch (error) {
      console.error('Error in handleUpdateUsername:', error);
      socket.emit('error', { message: 'Failed to update username.' });
    }
  };

  // Register all event listeners
  socket.on('joinRoom', joinRoom);
  socket.on('leaveRoom', leaveRoom);
  socket.on('disconnect', disconnect);
  socket.on('updateUsername', handleUpdateUsername); 
};