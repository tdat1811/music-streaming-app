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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Comment', commentSchema);
