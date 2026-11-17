const mongoose = require('mongoose');

// Thông báo gửi tới một người dùng:
// - comment_reply: có người trả lời bình luận của mình
// - artist_request_approved / artist_request_rejected: kết quả đăng ký làm nghệ sĩ
// - artist_new_post / artist_new_song: nghệ sĩ mình theo dõi có bài đăng / bài hát mới
// - content_removed: nội dung của mình bị gỡ vì vi phạm tiêu chuẩn cộng đồng (kèm số lần vi phạm)
// - artist_page_hidden / artist_page_restored: admin ẩn / hiện lại trang nghệ sĩ của mình
const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    // Người nhận
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        'comment_reply',
        'artist_request_approved',
        'artist_request_rejected',
        'artist_new_post',
        'artist_new_song',
        'content_removed',
        'artist_page_hidden',
        'artist_page_restored',
      ],
      default: 'comment_reply',
    },
    // Người trả lời
    actorId: { type: String, default: '' },
    actorName: { type: String, default: '' },
    // Bài đăng (chỉ có ở thông báo bình luận)
    postId: { type: String, default: '' },
    // Yêu cầu nghệ sĩ (chỉ có ở thông báo kết quả đăng ký nghệ sĩ)
    requestId: { type: String, default: '' },
    // Thông báo từ nghệ sĩ mình theo dõi: bài đăng mới / bài hát mới
    artistId: { type: String, default: '' },
    songId: { type: String, default: '' },
    // Bình luận gốc (thread) và câu trả lời mới
    commentId: { type: String, default: '' },
    // Bình luận được trả lời (bình luận gốc hoặc một câu trả lời trong thread)
    targetCommentId: { type: String, default: '' },
    replyId: { type: String, default: '' },
    text: { type: String, default: '' },
    // Thông báo vi phạm: loại nội dung bị gỡ, quy định, số lần vi phạm còn hiệu lực
    targetType: { type: String, default: '' },
    rule: { type: String, default: '' },
    violationCount: { type: Number, default: 0 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
