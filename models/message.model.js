// message.model.js

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  senderRole: {
    type: String,
    required: true,
    default: 'Participant',
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  replyTo: {
    messageId: { type: String },
    senderName: { type: String },
    content: { type: String },
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);