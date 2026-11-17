const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    // Nghệ sĩ đăng bài (trỏ tới Artist.id). Khi có, tên và ảnh tác giả lấy từ Artist lúc trả về.
    authorArtistId: { type: String, default: null },
    // Tên / ảnh tác giả lưu sẵn: dùng cho dữ liệu cũ chưa có authorArtistId
    authorName: { type: String, default: '' },
    authorAvatar: { type: String, default: '' },
    content: { type: String, default: '' },
    timeAgo: { type: String, default: 'Just now' },
    // Bài đăng có thể kèm 1 bài hát hoặc chỉ có nội dung chữ
    songId: { type: String, default: null },
    likes: { type: Number, default: 0 },
    likedByUserIds: [{ type: String }],
    shares: { type: Number, default: 0 },
    // Lần sửa gần nhất (null = chưa sửa) – app hiện chữ "edited"
    editedAt: { type: Date, default: null },
    // Giai đoạn 5: bị admin gỡ vì vi phạm / tạm ẩn vì trang nghệ sĩ bị ẩn hoặc chủ trang bị khoá
    removedAt: { type: Date, default: null },
    removedRule: { type: String, default: '' },
    removedViolationId: { type: String, default: null },
    suspendedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

feedPostSchema.index({ authorArtistId: 1 });

// Bài đăng hiện trên Feed
const PUBLIC_POST_FILTER = { removedAt: null, suspendedAt: null };

module.exports = mongoose.model('FeedPost', feedPostSchema);
module.exports.PUBLIC_POST_FILTER = PUBLIC_POST_FILTER;
