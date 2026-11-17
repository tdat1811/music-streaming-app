const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    // Tên nghệ sĩ hiển thị (giữ để tương thích); liên kết thật dùng artistId
    artist: { type: String, required: true },
    artistId: { type: String, default: null },
    coverImage: { type: String, default: '' },
    songIds: [{ type: String }],
    isTrending: { type: Boolean, default: false },
    releaseYear: { type: String, default: '2024' },
    status: { type: String, enum: ['draft', 'published', 'hidden'], default: 'published' },
  },
  {
    timestamps: true,
  }
);

albumSchema.index({ title: 'text', artist: 'text' });
albumSchema.index({ artistId: 1 });

module.exports = mongoose.model('Album', albumSchema);
