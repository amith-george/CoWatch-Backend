const express = require('express');
const cors = require('cors');
const app = express();
const roomRoutes = require('./routes/room.routes');
const messageRoutes = require('./routes/message.routes');
const youtubeRoutes = require('./routes/youtube.routes');
const twitchRoutes = require('./routes/twitch.routes');
const statusRoutes = require('./routes/status.routes');

app.use(cors());
app.use(express.json());

// Define a welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the CoWatch API');
});

// Define the routes
app.use('/rooms', roomRoutes);
app.use('/messages', messageRoutes);
app.use('/youtube', youtubeRoutes);
app.use('/twitch', twitchRoutes);
app.use('/status', statusRoutes);

module.exports = app;
