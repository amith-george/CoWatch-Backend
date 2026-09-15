const cron = require('node-cron');
const Room = require('../models/room.model');
const Message = require('../models/message.model');

function startCleanupJob() {
  // ⏰ Runs every hour (at minute 0)
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      // Find all rooms that have expired
      const expiredRooms = await Room.find({ expiresAt: { $lt: now } });

      if (expiredRooms.length === 0) {
        return;
      }

      const expiredRoomIds = expiredRooms.map(r => r.roomId);
      const expiredMongoIds = expiredRooms.map(r => r._id);

      // First, delete all messages associated with the expired rooms
      const messageResult = await Message.deleteMany({ roomId: { $in: expiredRoomIds } });
      const deletedMessagesCount = messageResult.deletedCount || 0;

      // Then, delete the rooms themselves
      const roomResult = await Room.deleteMany({ _id: { $in: expiredMongoIds } });
      const deletedRoomsCount = roomResult.deletedCount || 0;

      console.log(`✅ Deleted ${deletedRoomsCount} expired rooms and ${deletedMessagesCount} associated messages at ${now.toISOString()}`);
    } catch (err) {
      console.error('❌ Error during cleanup:', err.message);
    }
  });

  console.log('⏰ Hourly room and message cleanup cron job started');
}

module.exports = startCleanupJob;