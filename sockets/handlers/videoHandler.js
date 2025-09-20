// src/server/videoHandler.js

const Room = require('../../models/room.model');
const { isUserInControl } = require('../roomManager');

// Server-side store for the official state of each room's player
const roomStates = {};

module.exports = (io, socket, rooms) => {
  const changeVideo = async ({ roomId, videoUrl }) => {
    try {
      console.log('Server: changeVideo', { roomId, videoUrl }); // Debug log
      if (!isUserInControl(roomId, socket.userId)) {
        console.log('Server: Permission denied for changeVideo', { roomId, userId: socket.userId });
        return socket.emit('error', { message: 'Permission denied.' });
      }
      roomStates[roomId] = { status: 1, time: 0, lastUpdated: Date.now() };
      io.to(roomId).emit('syncPlayerState', roomStates[roomId]);

      const room = await Room.findOneAndUpdate(
        { roomId },
        { $set: { videoUrl: videoUrl }, $addToSet: { history: videoUrl } },
        { new: true }
      );
      if (!room) {
        console.log('Server: Room not found for changeVideo', { roomId });
        return socket.emit('error', { message: 'Room not found.' });
      }
      io.to(roomId).emit('historyUpdate', { history: room.history });
      io.to(roomId).emit('videoUpdate', { videoUrl: room.videoUrl });
    } catch (err) {
      console.error('Error changing video:', err);
      socket.emit('error', { message: 'Failed to change video.' });
    }
  };

  const addToPlaylist = async ({ roomId, videoUrl }) => {
    try {
      console.log('Server: addToPlaylist', { roomId, videoUrl }); // Debug log
      if (!rooms[roomId] || !rooms[roomId][socket.userId]) {
        console.log('Server: User not in room for addToPlaylist', { roomId, userId: socket.userId });
        return socket.emit('error', { message: 'You must be in the room to add to the playlist.' });
      }
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $addToSet: { queue: videoUrl } },
        { new: true }
      );
      if (!room) {
        console.log('Server: Room not found for addToPlaylist', { roomId });
        return socket.emit('error', { message: 'Room not found.' });
      }
      io.to(roomId).emit('playlistUpdate', { playlist: room.queue });
    } catch (err) {
      console.error('Error adding to playlist:', err);
      socket.emit('error', { message: 'Failed to add video to playlist.' });
    }
  };

  const playNextInQueue = async ({ roomId, mode }) => {
    try {
      console.log('Server: playNextInQueue', { roomId, mode }); // Debug log
      let room = await Room.findOne({ roomId });
      if (!room) {
        console.log('Server: Room not found for playNextInQueue', { roomId });
        return socket.emit('error', { message: 'Room not found.' });
      }
      if (!isUserInControl(roomId, socket.userId)) {
        console.log('Server: Permission denied for playNextInQueue', { roomId, userId: socket.userId });
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
    console.log(`SERVER: Received playerStateChange from socket ${socket.id} for room ${roomId}`, state);
    
    if (isUserInControl(roomId, socket.userId)) {
      roomStates[roomId] = {
        status: state.status,
        time: state.time ?? 0,
        lastUpdated: Date.now(),
      };
      console.log(`SERVER: Broadcasting syncPlayerState to room ${roomId}`, roomStates[roomId]);
      io.to(roomId).emit('syncPlayerState', roomStates[roomId]);
    } else {
      console.warn(`SERVER: Permission denied for playerStateChange from ${socket.id} in room ${roomId}`);
    }
  };

  const handleRequestInitialState = async ({ roomId }) => {
    try {
      console.log('Server: handleRequestInitialState', { roomId }); // Debug log
      const room = await Room.findOne({ roomId }).lean();
      if (!room) {
        console.log('Server: Room not found for handleRequestInitialState', { roomId });
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

  const removePlaylistItem = async ({ roomId, videoUrl }) => {
    try {
      console.log('Server: removePlaylistItem', { roomId, videoUrl }); // Debug log
      if (!isUserInControl(roomId, socket.userId)) {
        console.log('Server: Permission denied for removePlaylistItem', { roomId, userId: socket.userId });
        return socket.emit('error', { message: 'Permission denied.' });
      }
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $pull: { queue: videoUrl } },
        { new: true }
      );
      if (!room) {
        console.log('Server: Room not found for removePlaylistItem', { roomId });
        return socket.emit('error', { message: 'Room not found.' });
      }
      console.log('Server: Emitting playlistUpdate', { roomId, playlist: room.queue }); // Debug log
      io.to(roomId).emit('playlistUpdate', { playlist: room.queue });
    } catch (err) {
      console.error('Error removing from playlist:', err);
      socket.emit('error', { message: 'Failed to remove video from playlist.' });
    }
  };

  const movePlaylistItem = async ({ roomId, videoUrl, direction }) => {
    try {
      console.log('Server: movePlaylistItem', { roomId, videoUrl, direction }); // Debug log
      if (!isUserInControl(roomId, socket.userId)) {
        console.log('Server: Permission denied for movePlaylistItem', { roomId, userId: socket.userId });
        return socket.emit('error', { message: 'Permission denied.' });
      }
      const room = await Room.findOne({ roomId });
      if (!room) {
        console.log('Server: Room not found for movePlaylistItem', { roomId });
        return socket.emit('error', { message: 'Room not found.' });
      }
      
      const queue = room.queue;
      const index = queue.indexOf(videoUrl);
      
      if (index === -1) {
        console.log('Server: Video not found in queue', { roomId, videoUrl });
        return socket.emit('error', { message: 'Video not found in playlist.' });
      }

      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= queue.length) {
        console.log('Server: Invalid move operation', { roomId, videoUrl, direction, newIndex });
        return socket.emit('error', { message: 'Invalid move operation.' });
      }
      
      [queue[index], queue[newIndex]] = [queue[newIndex], queue[index]];
      room.queue = queue;
      await room.save();
      
      console.log('Server: Emitting playlistUpdate', { roomId, playlist: room.queue }); // Debug log
      io.to(roomId).emit('playlistUpdate', { playlist: room.queue });
    } catch (err) {
      console.error('Error moving playlist item:', err);
      socket.emit('error', { message: 'Failed to move playlist item.' });
    }
  };

  // Register all event listeners
  socket.on('changeVideo', changeVideo);
  socket.on('addToPlaylist', addToPlaylist);
  socket.on('playNextInQueue', playNextInQueue);
  socket.on('playerStateChange', handlePlayerStateChange);
  socket.on('requestInitialState', handleRequestInitialState);
  socket.on('removePlaylistItem', removePlaylistItem);
  socket.on('movePlaylistItem', movePlaylistItem);
};