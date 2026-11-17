const mongoose = require('mongoose');

// Một lần vi phạm tiêu chuẩn cộng đồng: mỗi lần admin gỡ bình luận / bài đăng / bài hát của một tài khoản.
// Lưu bản sao nội dung để đối chiếu sau này. Vi phạm không hết hạn; chỉ huỷ (revoke) khi gỡ nhầm.
const violationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    // Tài khoản vi phạm (tác giả bình luận, hoặc chủ trang nghệ sĩ với bài đăng / bài hát)
    userId: { type: String, required: true, index: true },
    targetType: { type: String, enum: ['song', 'post', 'comment'], required: true },
    targetId: { type: String, required: true },
    // Bản sao nội dung lúc bị gỡ
    snapshot: { type: String, default: '' },
    rule: { type: String, required: true },
    note: { type: String, default: '' },
    adminId: { type: String, required: true },
    reportCount: { type: Number, default: 0 },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Violation', violationSchema);
