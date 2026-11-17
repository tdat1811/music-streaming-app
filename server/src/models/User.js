const mongoose = require('mongoose');

// Vai trò tài khoản (độc lập với gói VIP planId):
// - listener: người nghe (mặc định)  - artist: nghệ sĩ, gắn với 1 Artist qua artistId  - admin: quản trị
const ROLES = ['listener', 'artist', 'admin'];

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    password: { type: String, required: true },
    planId: { type: String, default: null }, // null | 'free' | 'premium'
    // Ngày hết hạn gói VIP (1 tháng sau khi thanh toán). null = chưa từng mua / gói Free
    planExpiresAt: { type: Date, default: null },
    role: { type: String, enum: ROLES, default: 'listener' },
    // Trang nghệ sĩ mà tài khoản này sở hữu (chỉ có khi role = 'artist')
    artistId: { type: String, default: null },
    likedSongIds: [{ type: String }],
    followedArtistIds: [{ type: String }],
    likedAlbumIds: [{ type: String }],
    downloadedSongIds: [{ type: String }],
    // Khoá tài khoản (giai đoạn 5): permanent = vi phạm lần thứ 4 (không mở được), manual = admin khoá tay
    lockedAt: { type: Date, default: null },
    lockType: { type: String, enum: ['permanent', 'manual', null], default: null },
    lockReason: { type: String, default: '' },
    lockNote: { type: String, default: '' },
    // adminId, hoặc 'auto' khi hệ thống tự khoá
    lockedBy: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
