const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app'); // Express app
const connectDB = require('./database/connect'); // MongoDB connection function
const startRoomCleanupJob = require('./tasks/roomCleanup');


const PORT = process.env.PORT || 4000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // restrict to frontend later
    methods: ['GET', 'POST'],
  },
});

// Make io accessible in controllers
app.set('io', io);

// Initialize socket handlers
require('./sockets/roomSocket')(io);

// Connect to DB and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);

      require('./tasks/messageQueue');
      startRoomCleanupJob();
    });
  })
  .catch((err) => {
    console.error('❌ DB connection failed:', err);
    process.exit(1);
  });
