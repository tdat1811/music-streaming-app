const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    coverImage: { type: String, default: '' },
    songIds: [{ type: String }],
    isTrending: { type: Boolean, default: false },
    releaseYear: { type: String, default: '2024' },
  },
  {
    timestamps: true,
  }
);

albumSchema.index({ title: 'text', artist: 'text' });

module.exports = mongoose.model('Album', albumSchema);
