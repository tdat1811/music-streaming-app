const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// app.js chỉ tạo và cấu hình Express (để kiểm thử import được mà không kết nối CSDL,
// không mở cổng). Kết nối MongoDB và lắng nghe cổng nằm ở src/server.js.

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static audio files directory
app.use('/audio', express.static(path.join(__dirname, '../public/audio')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Music Streaming RESTful API is running successfully!',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/songs', require('./routes/songRoutes'));
app.use('/api/albums', require('./routes/albumRoutes'));
app.use('/api/artists', require('./routes/artistRoutes'));
app.use('/api/playlists', require('./routes/playlistRoutes'));
app.use('/api/charts', require('./routes/chartRoutes'));
app.use('/api/feed', require('./routes/feedRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} không tồn tại.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message,
  });
});

module.exports = app;
