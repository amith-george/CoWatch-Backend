const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true, // this is the room-unique username
  },
  senderRole: {
    type: String,
    required: true,
    default: 'Participant', // Good practice to have a default
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000, // see next section
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
