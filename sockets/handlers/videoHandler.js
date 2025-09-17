const Room = require('../../models/room.model');
const { isUserInControl } = require('../roomManager');

// Server-side store for the official state of each room's player
const roomStates = {};

module.exports = (io, socket, rooms) => {
  const changeVideo = async ({ roomId, videoUrl }) => {
    try {
      if (!isUserInControl(roomId, socket.userId)) {
        return socket.emit('error', { message: 'Permission denied.' });
      }
      roomStates[roomId] = { status: 1, time: 0, lastUpdated: Date.now() };
      io.to(roomId).emit('syncPlayerState', roomStates[roomId]);

      const room = await Room.findOneAndUpdate(
        { roomId },
        { $set: { videoUrl: videoUrl }, $addToSet: { history: videoUrl } },
        { new: true }
      );
      if (!room) return socket.emit('error', { message: 'Room not found.' });
      io.to(roomId).emit('historyUpdate', { history: room.history });
      io.to(roomId).emit('videoUpdate', { videoUrl: room.videoUrl });
    } catch (err) {
      console.error('Error changing video:', err);
      socket.emit('error', { message: 'Failed to change video.' });
    }
  };

  const addToPlaylist = async ({ roomId, videoUrl }) => {
    try {
      if (!rooms[roomId] || !rooms[roomId][socket.userId]) {
        return socket.emit('error', { message: 'You must be in the room to add to the playlist.' });
      }
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $addToSet: { queue: videoUrl } },
        { new: true }
      );
      if (!room) return socket.emit('error', { message: 'Room not found.' });
      io.to(roomId).emit('playlistUpdate', { playlist: room.queue });
    } catch (err) {
      console.error('Error adding to playlist:', err);
      socket.emit('error', { message: 'Failed to add video to playlist.' });
    }
  };

  const playNextInQueue = async ({ roomId, mode }) => {
    try {
      let room = await Room.findOne({ roomId });
      if (!room) return socket.emit('error', { message: 'Room not found.' });
      if (!isUserInControl(roomId, socket.userId)) {
        return socket.emit('error', { message: 'Only the host or a moderator can control autoplay.' });
      }
      if (room.queue.length === 0) return;
      let nextVideoUrl;
      if (mode === 'shuffle' && room.queue.length > 1) {
        const randomIndex = Math.floor(Math.random() * room.queue.length);
        nextVideoUrl = room.queue[randomIndex];
      } else {
        nextVideoUrl = room.queue[0];
      }
      const updatedRoom = await Room.findOneAndUpdate(
        { roomId },
        {
          $set: { videoUrl: nextVideoUrl },
          $addToSet: { history: nextVideoUrl },
          $pull: { queue: nextVideoUrl },
        },
        { new: true }
      );
      if (!updatedRoom) return;

      roomStates[roomId] = { status: 1, time: 0, lastUpdated: Date.now() };
      io.to(roomId).emit('syncPlayerState', roomStates[roomId]);

      io.to(roomId).emit('videoUpdate', { videoUrl: updatedRoom.videoUrl });
      io.to(roomId).emit('historyUpdate', { history: updatedRoom.history });
      io.to(roomId).emit('playlistUpdate', { playlist: updatedRoom.queue });
    } catch (err) {
      console.error('Error playing next video:', err);
      socket.emit('error', { message: 'Failed to play next video.' });
    }
  };

  const handlePlayerStateChange = ({ roomId, state }) => {
    // [DEBUG] Log 1: Confirms the server received the event.
    console.log(`SERVER: Received playerStateChange from socket ${socket.id} for room ${roomId}`, state);
    
    if (isUserInControl(roomId, socket.userId)) {
      roomStates[roomId] = {
        status: state.status,
        time: state.time ?? 0,
        lastUpdated: Date.now(),
      };

      // [DEBUG] Log 2: Confirms the server is broadcasting the new state.
      console.log(`SERVER: Broadcasting syncPlayerState to room ${roomId}`, roomStates[roomId]);
      io.to(roomId).emit('syncPlayerState', roomStates[roomId]);
    } else {
      // [DEBUG] Log 3: Fires if the user does not have permission.
      console.warn(`SERVER: Permission denied for playerStateChange from ${socket.id} in room ${roomId}`);
    }
  };

  const handleRequestInitialState = async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId }).lean();
      if (!room) {
        return socket.emit('error', { message: 'Room not found during initial state request.' });
      }

      const currentState = roomStates[roomId] || { status: 2, time: 0, lastUpdated: Date.now() };

      const initialState = {
        ...currentState,
        videoUrl: room.videoUrl,
      };

      io.to(socket.id).emit('initialState', initialState);
      console.log(`SERVER: Sent initial state for room ${roomId} to ${socket.id}`, initialState);
    } catch (err) {
      console.error(`Error fetching initial state for room ${roomId}:`, err);
      socket.emit('error', { message: 'Could not retrieve room state.' });
    }
  };

  // --- Register all event listeners ---
  socket.on('changeVideo', changeVideo);
  socket.on('addToPlaylist', addToPlaylist);
  socket.on('playNextInQueue', playNextInQueue);
  socket.on('playerStateChange', handlePlayerStateChange);
  socket.on('requestInitialState', handleRequestInitialState);
};