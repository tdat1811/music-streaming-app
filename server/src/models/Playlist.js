const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: 'Custom playlist' },
    coverImage: { type: String, default: '' },
    songIds: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Playlist', playlistSchema);
