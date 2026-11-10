const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    password: { type: String, required: true },
    planId: { type: String, default: null }, // null | 'premium' | 'family' | 'student'
    likedSongIds: [{ type: String }],
    followedArtistIds: [{ type: String }],
    likedAlbumIds: [{ type: String }],
    downloadedSongIds: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
