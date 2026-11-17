const mongoose = require('mongoose');

// Nhật ký thao tác quản trị (chỉ thêm, không sửa / xoá). adminId = null khi hệ thống tự làm (tự khoá / tự mở).
const ACTIONS = [
  'remove_content',
  'revoke_violation',
  'dismiss_reports',
  'lock',
  'unlock',
  'auto_lock',
  'auto_unlock',
  'change_role',
  'verify',
  'unverify',
  'hide_page',
  'unhide_page',
];

const adminActionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    adminId: { type: String, default: null },
    action: { type: String, enum: ACTIONS, required: true },
    // user | artist | song | post | comment
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    // Tên hiển thị của đối tượng lúc thao tác (tên tài khoản, tên bài, trích nội dung)
    targetLabel: { type: String, default: '' },
    rule: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

adminActionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminAction', adminActionSchema);
module.exports.ACTIONS = ACTIONS;
