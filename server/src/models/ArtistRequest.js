const mongoose = require('mongoose');
const { GENRES, REJECT_REASONS, REQUEST_STATUSES } = require('../config/artistRequest');

// Yêu cầu trở thành nghệ sĩ: người nghe gửi, Admin duyệt hoặc từ chối
const artistRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    stageName: { type: String, required: true },
    // Nghệ danh đã chuẩn hoá (không dấu, chữ thường) để kiểm tra trùng
    stageNameKey: { type: String, required: true, index: true },
    genres: [{ type: String, enum: GENRES }],
    bio: { type: String, default: '' },
    avatarImage: { type: String, default: '' },
    socialLinks: [{ type: String }],
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending', index: true },
    // Kết quả xét duyệt
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    rejectReason: { type: String, enum: [...Object.keys(REJECT_REASONS), null], default: null },
    rejectNote: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    // Trang nghệ sĩ được tạo khi duyệt
    createdArtistId: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ArtistRequest', artistRequestSchema);
