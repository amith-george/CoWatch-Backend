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
      }));
      
      io.to(roomId).emit('userLeft', { userId, username });
      io.to(roomId).emit('membersUpdate', { members });
    }
  }
}

// --- NEW FUNCTION ---
// Checks if a user has permission to control the player.
function isUserInControl(roomId, userId) {
  const room = rooms[roomId];
  if (!room) return false;

  const hostId = Object.keys(room).find(uid => room[uid].role === 'Host');

  // If the host is in the room, only they have control.
  if (hostId) {
    return userId === hostId;
  }

  // If the host is NOT in the room, any moderator has control.
  const user = room[userId];
  return user && user.role === 'Moderator';
}


module.exports = {
  rooms,
  handleUserLeave,
  isUserInControl, // Export the new function
};