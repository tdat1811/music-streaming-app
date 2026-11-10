const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Music Streaming API Server is running on port ${PORT}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}/api/health`);
});

module.exports = app;
