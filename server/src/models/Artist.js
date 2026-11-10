const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    followers: { type: String, default: '100K Followers' },
    avatarImage: { type: String, default: '' },
    aboutImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    isPopular: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

artistSchema.index({ name: 'text' });

module.exports = mongoose.model('Artist', artistSchema);
