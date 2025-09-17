// sockets/handlers/moderationHandler.js

const Room = require('../../models/room.model');
const { handleUserLeave } = require('../roomManager');

// Helper to get the user ID of the requester
const getRequesterId = (rooms, roomId, socketId) => {
  return Object.keys(rooms[roomId] || {}).find(uid => rooms[roomId][uid].socketId === socketId);
};

module.exports = (io, socket, rooms) => {

    // Make a user moderator
    socket.on('makeModerator', async ({ roomId, targetUserId }) => {
        try {
          const requesterId = Object.keys(rooms[roomId]).find(
            uid => rooms[roomId][uid].socketId === socket.id
          );
  
          if (!requesterId || rooms[roomId][requesterId].role !== 'Host') {
            return socket.emit('error', { message: 'Unauthorized action' });
          }
  
          const roomInDb = await Room.findOne({ roomId });
          const participant = roomInDb.participants.find(p => p.userId === targetUserId);
          if (!participant) {
            return socket.emit('error', { message: 'User not found or is not a participant.' });
          }
  
          roomInDb.moderators.push(participant);
          roomInDb.participants = roomInDb.participants.filter(p => p.userId !== targetUserId);
          await roomInDb.save();
  
          if (rooms[roomId][targetUserId]) {
            rooms[roomId][targetUserId].role = 'Moderator';
          }
  
          // FIX: Use Object.entries to correctly build the members list with userId
          const members = Object.entries(rooms[roomId]).map(([uid, userData]) => ({
            userId: uid,
            username: userData.username,
            role: userData.role
          }));
          io.to(roomId).emit('membersUpdate', { members });
  
        } catch (error) {
          console.error('Error making moderator:', error);
          socket.emit('error', { message: 'Failed to promote user.' });
        }
      });
  
      
      // Demote a user from being moderator
      socket.on('removeModerator', async ({ roomId, targetUserId }) => {
        try {
          if (!rooms[roomId]) {
            return socket.emit('error', { message: 'Room not active.' });
          }
          
          const requesterUserId = Object.keys(rooms[roomId]).find(
            uid => rooms[roomId][uid].socketId === socket.id
          );
  
          if (!requesterUserId) {
            return socket.emit('error', { message: 'Authentication error.' });
          }
  
          const room = await Room.findOne({ roomId });
          if (!room) {
            return socket.emit('error', { message: 'Room not found.' });
          }
  
          if (room.host.userId !== requesterUserId) {
            return socket.emit('error', { message: 'Permission Denied.' });
          }
  
          const moderatorToDemote = room.moderators.find(m => m.userId === targetUserId);
          if (!moderatorToDemote) {
            return socket.emit('error', { message: 'User is not a moderator.' });
          }
  
          room.moderators = room.moderators.filter(m => m.userId !== targetUserId);
          room.participants.push(moderatorToDemote);
          await room.save();
          
          if (rooms[roomId][targetUserId]) {
            rooms[roomId][targetUserId].role = 'Participant';
          }
  
          // FIX: Use Object.entries here as well for consistency and correctness
          const members = Object.entries(rooms[roomId]).map(([uid, userData]) => ({
            userId: uid,
            username: userData.username,
            role: userData.role
          }));
          io.to(roomId).emit('membersUpdate', { members });
          
        } catch (err) {
          console.error('Error removing moderator:', err);
          socket.emit('error', { message: 'An internal server error occurred.' });
        }
      });
  
  
      // Kick a user from the room
      socket.on('kickUser', async ({ roomId, targetUserId }) => {
        try{
          const requesterId = socket.id;
          const requester = Object.values(rooms[roomId]).find(u => u.socketId === requesterId);
  
          if (!requester || (requester.role !== 'Host' && requester.role !== 'Moderator')) {
            return socket.emit('error', { message: 'Unauthorized.'});
          }
  
          const targetUser = rooms[roomId][targetUserId];
          if (!targetUser) return;
          const targetSocket = io.sockets.sockets.get(targetUser.socketId);
  
          if (targetSocket) {
            targetSocket.emit('kicked', { message: 'You have been kicked from the room.'});
            targetSocket.disconnect(true);
          }
  
          handleUserLeave(socket, roomId, targetUserId, targetUser.username, io);
      
        } catch (error) {
          console.error('Error during kick:', error);
          socket.emit('error', { message: 'Failed to kick user.'});
        }
      });
  
  
      // Ban a user from the room
      socket.on('banUser', async ({ roomId, targetUserId }) => {
        try {
          const requesterId = Object.keys(rooms[roomId]).find(
            uid => rooms[roomId][uid].socketId === socket.id
          );
  
          const requester = rooms[roomId][requesterId];
          const targetUser = rooms[roomId][targetUserId];
  
          if (!requester || !targetUser) return;
  
          const isHost = requester.role === 'Host';
          const isModerator = requester.role === 'Moderator';
          const canBan = (isHost && requesterId !== targetUserId) || (isModerator && targetUser.role === 'Participant');
  
          if(!canBan) {
            return socket.emit('error', { message: 'You do not have permission to ban this user.'});
          }
  
          await Room.updateOne(
            { roomId },
            {
              $pull: {
                participants: { userId: targetUserId },
                moderators: { userId: targetUserId },
              },
              $addToSet: { bannedUsers: targetUserId },
            }
          );
  
          const targetSocket = io.sockets.sockets.get(targetUser.socketId);
          if (targetSocket) {
            targetSocket.emit('banned', { message: 'You have been banned from this room.'})
            targetSocket.disconnect(true);
          }
  
          handleUserLeave(socket, roomId, targetUserId, targetUser.username, io);
          
        } catch (error) {
          console.error('Error during ban:', error);
          socket.emit('error', { message: 'Failed to ban user.'});
        }
      });

};