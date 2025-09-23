// sockets/handlers/screenShareHandler.js

module.exports = (io, socket, rooms) => {
  // When a user starts sharing their screen
  const startShare = ({ roomId }) => {
    console.log(`User ${socket.id} started screen share in room ${roomId}`);
    // Track who is sharing in the in-memory room object
    if (rooms[roomId]) {
      rooms[roomId].screenSharerSocketId = socket.id;
    }
    // Notify everyone else in the room that a share has started
    socket.to(roomId).emit('screenShareStarted', { sharerId: socket.id });
  };

  // When a user stops sharing their screen
  const stopShare = ({ roomId }) => {
    console.log(`User ${socket.id} stopped screen share in room ${roomId}`);
    // Stop tracking the sharer
    if (rooms[roomId]) {
      delete rooms[roomId].screenSharerSocketId;
    }
    // Notify everyone in the room that the share has ended
    io.to(roomId).emit('screenShareStopped');
  };

  // Relays the WebRTC offer from the sharer to a specific viewer
  const handleOffer = ({ offer, viewerSocketId }) => {
    io.to(viewerSocketId).emit('webrtc-offer', { offer, sharerSocketId: socket.id });
  };

  // Relays the WebRTC answer from a viewer back to the sharer
  const handleAnswer = ({ answer, sharerSocketId }) => {
    io.to(sharerSocketId).emit('webrtc-answer', { answer, viewerSocketId: socket.id });
  };

  // Relays ICE candidates between peers to help establish a connection
  const handleIceCandidate = ({ candidate, targetSocketId }) => {
    io.to(targetSocketId).emit('webrtc-ice-candidate', { candidate, sourceSocketId: socket.id });
  };

  socket.on('start-screen-share', startShare);
  socket.on('stop-screen-share', stopShare);
  socket.on('webrtc-offer', handleOffer);
  socket.on('webrtc-answer', handleAnswer);
  socket.on('webrtc-ice-candidate', handleIceCandidate);
};