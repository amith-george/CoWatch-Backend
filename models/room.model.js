const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: String, default: null },  // null for guests
  username: { type: String, required: true }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  roomName: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 20,
    match: [/^\S+$/, 'Room name must not contain spaces'],
    lowercase: true,
  },
  videoUrl: {
    type: String,
    default: 'https://youtu.be/8yh9BPUBbbQ',
  },
  queue: {
    type: [String],
    default: [],
  },
  history: {
    type: [String],
    default: [],
  },

  host: {
    userId: { type: String, default: null },
    username: { type: String, required: true }
  },

  moderators: {
    type: [participantSchema],
    default: [],
  },

  participants: {
    type: [participantSchema],
    default: [],
  },

  bannedUsers: {
    type: [String],
    default: [],
  },

  duration: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
