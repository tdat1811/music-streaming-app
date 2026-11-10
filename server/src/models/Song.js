const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    plays: { type: String, default: '10K' },
    duration: { type: String, default: '03:30' },
    coverImage: { type: String, default: '' },
    audioUrl: { type: String, default: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    category: { type: String, default: 'general' }, // 'suggestions', 'charts', 'search', etc.
  },
  {
    timestamps: true,
  }
);

// Tạo text index phục vụ tìm kiếm theo tên bài hát hoặc ca sĩ
songSchema.index({ title: 'text', artist: 'text' });

module.exports = mongoose.model('Song', songSchema);
