const { v4: uuidv4 } = require('uuid');
const Room = require('../models/room.model');

// Create a room
exports.createRoom = async (req, res) => {
  try {
    const { roomName, duration, hostId, username } = req.body;

    if (!roomName || !duration || !hostId || !username) {
      return res.status(400).json({ message: 'roomName, duration, hostId, and username are required.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60000); // minutes to ms

    const room = new Room({
      roomId: uuidv4(),
      roomName,
      duration,
      host: { userId: hostId, username },
      createdAt: now,
      expiresAt,
      isActive: true,
      history: ['https://youtu.be/8yh9BPUBbbQ'],
    });

    await room.save();

    return res.status(201).json({
      message: 'Room created successfully',
      room,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room || !room.isActive) {
      return res.status(404).json({ message: 'Room not found or inactive' });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error('Error fetching room:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Delete room
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.host.userId !== hostId) {
      return res.status(403).json({ message: 'Only the host can delete the room' });
    }

    await Room.deleteOne({ roomId });

    return res.status(200).json({ message: 'Room permanently deleted' });
  } catch (error) {
    console.error('Error deleting room:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Join a room (add participant to the database)
exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, username } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ message: 'userId and username are required.' });
    }

    const room = await Room.findOne({ roomId });
    if (!room || !room.isActive) {
      return res.status(404).json({ message: 'Room not found or has expired.' });
    }

    // Check if username is already taken by another participant
    const isTaken = room.participants.some(p => p.username.toLowerCase() === username.toLowerCase());
    if (isTaken) {
      return res.status(409).json({ message: 'Username already taken in this room.' });
    }

    // Add the user to the participants array using $addToSet to prevent duplicates
    await Room.updateOne(
      { roomId },
      { $addToSet: { participants: { userId, username } } }
    );

    return res.status(200).json({
      message: 'Successfully joined the room.',
      user: { userId, username },
    });

  } catch (error) {
    console.error('Error joining room:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
