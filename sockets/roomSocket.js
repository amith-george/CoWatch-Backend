// sockets/roomSocket.js

const { rooms } = require('./roomManager');
const registerConnectionHandlers = require('./handlers/connectionHandler');
const registerChatHandlers = require('./handlers/chatHandler');
const registerModerationHandlers = require('./handlers/moderationHandler');
const registerVideoHandlers = require('./handlers/videoHandler');

function initRoomSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Register all event handlers for this socket connection
    registerConnectionHandlers(io, socket, rooms);
    registerChatHandlers(io, socket, rooms);
    registerModerationHandlers(io, socket, rooms);
    registerVideoHandlers(io, socket, rooms);
  });
}

module.exports = initRoomSocket;