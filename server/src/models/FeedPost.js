const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String, default: '' },
    timeAgo: { type: String, default: 'Just now' },
    songId: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedByUserIds: [{ type: String }],
    shares: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FeedPost', feedPostSchema);
