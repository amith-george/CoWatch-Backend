// sockets/roomManager.js

const rooms = {}; // { roomId: { userId: { username, role, socketId } } }

function handleUserLeave(io, socket, roomId, userId) {
  if (rooms[roomId] && rooms[roomId][userId]) {
    const { username } = rooms[roomId][userId];
    delete rooms[roomId][userId];

    if (Object.keys(rooms[roomId]).length === 0) {
      delete rooms[roomId];
      console.log(`Room ${roomId} is now empty and has been removed from memory.`);
    }

    socket.leave(roomId);
    console.log(`${username} left room: ${roomId}`);

    if (rooms[roomId]) {
      const members = Object.entries(rooms[roomId]).map(([uid, userData]) => ({
        userId: uid,
        username: userData.username,
        role: userData.role,
        socketId: userData.socketId, // ✨ ADD THIS LINE
      }));
      
      io.to(roomId).emit('userLeft', { userId, username });
      io.to(roomId).emit('membersUpdate', { members });
    }
  }
}

function isUserInControl(roomId, userId) {
  const room = rooms[roomId];
  if (!room) return false;

  const user = room[userId];
  if (!user) return false;

  // Host always has control
  if (user.role === 'Host') return true;

  // Moderators have control ONLY if the host is not present in the room
  const hostIsPresent = Object.values(room).some(u => u.role === 'Host');
  if (!hostIsPresent && user.role === 'Moderator') return true;

  return false;
}

module.exports = {
  rooms,
  handleUserLeave,
  isUserInControl,
};