const cron = require('node-cron');
const Room = require('../models/room.model');
const Message = require('../models/message.model');

function startCleanupJob() {
  // ⏰ Runs every hour (at minute 0)
  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();
      // Find all rooms that have expired
      const expiredRooms = await Room.find({ expiresAt: { $lt: now } });

      if (expiredRooms.length === 0) {
        return;
      }

      let deletedRoomsCount = 0;
      let deletedMessagesCount = 0;

      // Loop through each expired room
      for (const room of expiredRooms) {
        // First, delete all messages associated with the expired room
        const result = await Message.deleteMany({ roomId: room.roomId });
        deletedMessagesCount += result.deletedCount;

        // Then, delete the room itself
        await Room.findByIdAndDelete(room._id);
        deletedRoomsCount++;
      }

      console.log(`✅ Deleted ${deletedRoomsCount} expired rooms and ${deletedMessagesCount} associated messages at ${now.toISOString()}`);
    } catch (err) {
      console.error('❌ Error during cleanup:', err.message);
    }
  });

  console.log('⏰ Hourly room and message cleanup cron job started');
}

module.exports = startCleanupJob;