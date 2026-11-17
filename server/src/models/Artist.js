const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    // Tài khoản (User.id) sở hữu trang nghệ sĩ; null = trang do hệ thống tạo, chưa có chủ
    ownerUserId: { type: String, default: null },
    // Số người theo dõi dạng số để cộng/trừ khi người dùng theo dõi / bỏ theo dõi
    followersCount: { type: Number, default: 0, min: 0 },
    avatarImage: { type: String, default: '' },
    aboutImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    genres: [{ type: String }],
    // Link mạng xã hội (vd instagram.com/abc), tối đa 3
    socialLinks: [{ type: String }],
    isPopular: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
    // Admin ẩn cả trang nghệ sĩ (giai đoạn 5)
    hiddenAt: { type: Date, default: null },
    hiddenReason: { type: String, default: '' },
    hiddenNote: { type: String, default: '' },
    // Tài khoản sở hữu đang bị khoá → trang cũng ẩn
    ownerLockedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

artistSchema.index({ name: 'text' });
artistSchema.index({ ownerUserId: 1 });

// Trang nghệ sĩ người nghe được thấy: không bị admin ẩn, chủ trang không bị khoá
const PUBLIC_ARTIST_FILTER = { hiddenAt: null, ownerLockedAt: null };

module.exports = mongoose.model('Artist', artistSchema);
module.exports.PUBLIC_ARTIST_FILTER = PUBLIC_ARTIST_FILTER;
