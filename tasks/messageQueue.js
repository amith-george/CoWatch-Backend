const Message = require('../models/message.model');
const Room = require('../models/room.model');

const messageQueue = {};
const MAX_QUEUE_SIZE = 25;
const FLUSH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

function queueMessage(roomId, message) {
    if (!roomId || !message) return;

    if (!messageQueue[roomId]) {
        messageQueue[roomId] = [];
    }

    messageQueue[roomId].push(message);

    if (messageQueue[roomId].length >= MAX_QUEUE_SIZE) {
        flushMessages(roomId);
    }
}

async function flushMessages(roomId) {
    const messages = messageQueue[roomId];
    if (!messages || messages.length === 0) return;

    // Check if the room still exists
    const roomExists = await Room.exists({ roomId });

    if (!roomExists) {
        // If room is deleted, discard messages
        console.log(`Room ${roomId} no longer exists. Discarding ${messages.length} queued messages.`);
        messageQueue[roomId] = []; // clear queue
        return;
    }

    // Otherwise, flush to DB
    const messagesToInsert = [...messages];
    messageQueue[roomId] = [];

    Message.insertMany(messagesToInsert)
        .then(() => {
            console.log(`✅ Flushed ${messagesToInsert.length} messages for room ${roomId}`);
        })
        .catch((err) => {
            console.error(`❌ Error flushing messages for room ${roomId}:`, err);
        });
}

// Get queued messages
function getQueuedMessages (roomId) {
    return messageQueue[roomId] || [];
}


// Flush all queues periodically
setInterval(() => {
    Object.keys(messageQueue).forEach((roomId) => flushMessages(roomId));
}, FLUSH_INTERVAL_MS);

module.exports = {
    queueMessage,
    flushMessages,
    getQueuedMessages,
};
