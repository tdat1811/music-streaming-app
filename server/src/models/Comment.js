const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  id: { type: String, required: true },
  postId: { type: String, required: true },
  // Tác giả (để gửi thông báo khi có người trả lời). Dữ liệu mẫu cũ có thể để trống.
  userId: { type: String, default: '' },
  userName: { type: String, required: true },
  userAvatar: { type: String, default: '' },
  text: { type: String, required: true },
  timeAgo: { type: String, default: 'Just now' },
  likes: { type: Number, default: 0 },
  likedByUserIds: [{ type: String }],
  replyToName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  // Giai đoạn 5: bị admin gỡ vì vi phạm
  removedAt: { type: Date, default: null },
  removedViolationId: { type: String, default: null },
});

const commentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    postId: { type: String, required: true, index: true },
    userId: { type: String, default: '' },
    userName: { type: String, required: true },
    userAvatar: { type: String, default: '' },
    text: { type: String, required: true },
    timeAgo: { type: String, default: 'Just now' },
    likes: { type: Number, default: 0 },
    likedByUserIds: [{ type: String }],
    replies: [replySchema],
    // Giai đoạn 5: bị admin gỡ vì vi phạm (cả thread trả lời cũng ẩn theo)
    removedAt: { type: Date, default: null },
    removedViolationId: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Comment', commentSchema);
