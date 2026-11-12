const mongoose = require('mongoose');

// Thông báo gửi tới một người dùng, hiện tại dùng cho: có người trả lời bình luận của mình
const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    // Người nhận
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['comment_reply'], default: 'comment_reply' },
    // Người trả lời
    actorId: { type: String, default: '' },
    actorName: { type: String, default: '' },
    postId: { type: String, required: true },
    // Bình luận gốc (thread) và câu trả lời mới
    commentId: { type: String, default: '' },
    // Bình luận được trả lời (bình luận gốc hoặc một câu trả lời trong thread)
    targetCommentId: { type: String, default: '' },
    replyId: { type: String, default: '' },
    text: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
