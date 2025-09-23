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

      // --- NEW LOGIC FOR LATE JOINERS ---
      const activeSharerId = rooms[roomId].screenSharerSocketId;
      if (activeSharerId && activeSharerId !== socket.id) {
        // 1. Tell the new user a share is already in progress
        io.to(socket.id).emit('screenShareStarted', { sharerId: activeSharerId });
        // 2. Tell the original sharer to create a new peer connection for the new user
        io.to(activeSharerId).emit('initiate-webrtc-peer', { newPeerSocketId: socket.id });
      }
      // --- END OF NEW LOGIC ---

      const members = Object.entries(rooms[roomId])
        // Filter out our internal tracking property before sending to clients
        .filter(([key]) => key !== 'screenSharerSocketId')
        .map(([uid, data]) => ({
          userId: uid,
          username: data.username,
          role: data.role,
          socketId: data.socketId,
        }));

      io.to(roomId).emit('userJoined', { userId, username, role });
      io.to(roomId).emit('membersUpdate', { members });
    } catch (error)      {
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

  const handleUpdateUsername = async ({ roomId, userId, newUsername }) => {
    try {
      const trimmedNewUsername = newUsername.trim();
      
      if (!trimmedNewUsername || trimmedNewUsername.length < 2 || trimmedNewUsername.length > 20) {
        return socket.emit('error', { message: 'Username must be between 2 and 20 characters.' });
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found.' });
      }

      const isTaken =
        (room.host.userId !== userId && room.host.username.toLowerCase() === trimmedNewUsername.toLowerCase()) ||
        room.moderators.some(m => m.userId !== userId && m.username.toLowerCase() === trimmedNewUsername.toLowerCase()) ||
        room.participants.some(p => p.userId !== userId && p.username.toLowerCase() === trimmedNewUsername.toLowerCase());

      if (isTaken) {
        return socket.emit('error', { message: 'This username is already taken in the room.' });
      }

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

      if (rooms[roomId] && rooms[roomId][userId]) {
        rooms[roomId][userId].username = trimmedNewUsername;
      } else {
        console.warn(`User ${userId} not in memory for room ${roomId} during name update.`);
        return;
      }

      const members = Object.entries(rooms[roomId])
        .filter(([key]) => key !== 'screenSharerSocketId')
        .map(([uid, data]) => ({
            userId: uid,
            username: data.username,
            role: data.role,
            socketId: data.socketId,
        }));
      io.to(roomId).emit('membersUpdate', { members });
      
      console.log(`User ${userId} in room ${roomId} changed name to ${trimmedNewUsername}`);
    } catch (error) {
      console.error('Error in handleUpdateUsername:', error);
      socket.emit('error', { message: 'Failed to update username.' });
    }
  };

  const handleScreenShareRequest = ({ roomId }) => {
    try {
      if (!rooms[roomId] || !rooms[roomId][socket.userId]) {
        return socket.emit('error', { message: 'You are not in this room.' });
      }

      const hostEntry = Object.entries(rooms[roomId]).find(([, data]) => data.role === 'Host');
      if (!hostEntry) {
        return socket.emit('error', { message: 'Could not find the host.' });
      }
      const [hostId, hostData] = hostEntry;

      const requesterUsername = rooms[roomId][socket.userId].username;

      io.to(hostData.socketId).emit('screenShareRequest', {
        requesterId: socket.userId,
        requesterUsername: requesterUsername,
      });

      console.log(`User ${requesterUsername} (${socket.userId}) is requesting to share screen in room ${roomId}.`);
    } catch (error) {
      console.error('Error in handleScreenShareRequest:', error);
      socket.emit('error', { message: 'Failed to request screen share.' });
    }
  };

  const handleScreenShareResponse = ({ roomId, requesterId, accepted }) => {
    try {
      if (!rooms[roomId] || !rooms[roomId][socket.userId] || rooms[roomId][socket.userId].role !== 'Host') {
        return socket.emit('error', { message: 'Only the host can respond to screen share requests.' });
      }

      const requester = rooms[roomId][requesterId];
      if (!requester) {
        return socket.emit('error', { message: 'The requesting user could not be found.' });
      }

      io.to(requester.socketId).emit('screenSharePermission', {
        granted: accepted,
      });

      console.log(`Host responded to screen share request from ${requester.username}. Accepted: ${accepted}`);
    } catch (error) {
      console.error('Error in handleScreenShareResponse:', error);
      socket.emit('error', { message: 'Failed to respond to screen share request.' });
    }
  };

  socket.on('joinRoom', joinRoom);
  socket.on('leaveRoom', leaveRoom);
  socket.on('disconnect', disconnect);
  socket.on('updateUsername', handleUpdateUsername);
  socket.on('screenShareRequest', handleScreenShareRequest);
  socket.on('screenShareResponse', handleScreenShareResponse);
};