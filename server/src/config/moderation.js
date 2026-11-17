// Cấu hình kiểm duyệt nội dung (giai đoạn 5)

// Quy định cộng đồng: admin chọn khi gỡ nội dung / khoá tài khoản / ẩn trang nghệ sĩ
const RULES = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or hate speech',
  offensive: 'Offensive or harmful content',
  copyright: 'Copyright infringement',
  scam: 'Scam or fraud',
  other: 'Other',
};

// Lý do người nghe chọn khi báo cáo (không có "Scam" riêng – gộp vào Spam / Other)
const REPORT_REASONS = ['spam', 'harassment', 'offensive', 'copyright', 'other'];

// Loại nội dung có thể báo cáo / gỡ
const TARGET_TYPES = ['song', 'post', 'comment'];

// Vi phạm thứ 4 (tức hơn 3 lần) → khoá vĩnh viễn. Vi phạm không hết hạn.
const MAX_VIOLATIONS = 3;
const LOCK_AT = MAX_VIOLATIONS + 1;

const REPORT_LIMITS = { perDay: 10, detailsMax: 300 };
const NOTE_MAX = 300;

const ruleLabel = (key) => RULES[key] || RULES.other;

module.exports = { RULES, REPORT_REASONS, TARGET_TYPES, MAX_VIOLATIONS, LOCK_AT, REPORT_LIMITS, NOTE_MAX, ruleLabel };
