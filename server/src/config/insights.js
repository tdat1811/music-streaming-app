// Cấu hình AI Fan Insight (giai đoạn 6)
const INSIGHT_LIMITS = {
  freePerDay: 3, // lượt miễn phí mỗi ngày cho mỗi nghệ sĩ (làm mới lúc 0 giờ theo giờ người dùng)
  cacheHours: 24, // kết quả được lưu và xem lại trong 24 giờ
  minComments: 10, // cần ít nhất bấy nhiêu bình luận mới gọi AI
  windowDays: 30, // xét bình luận và số liệu của 30 ngày gần nhất
  maxComments: 300, // gửi tối đa bấy nhiêu bình luận mới nhất
  commentMaxChars: 500, // cắt bớt bình luận quá dài
};

// Mua thêm 1 lượt khi đã hết lượt miễn phí (thanh toán giả lập giống mua gói VIP)
const EXTRA_INSIGHT_PRICE_USD = 3;
// Giá gói VIP để ghi lịch sử thanh toán (khớp SUBSCRIPTION_PLANS ở app)
const VIP_PRICE_USD = 9.99;

// Model Gemini mặc định: bản Flash ổn định, có trong gói miễn phí, hỗ trợ JSON theo schema.
// Đổi bằng biến môi trường GEMINI_MODEL mà không cần sửa code.
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
// Model dự phòng (cũng miễn phí): dùng khi model chính quá tải (503), lỗi, hết hạn mức hoặc quá giờ chờ.
// Đổi bằng GEMINI_FALLBACK_MODEL; đặt rỗng để tắt.
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
// Thời gian chờ tối đa cho mỗi model
const GEMINI_TIMEOUT_MS = 30000;

module.exports = { INSIGHT_LIMITS, EXTRA_INSIGHT_PRICE_USD, VIP_PRICE_USD, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_FALLBACK_MODEL, GEMINI_TIMEOUT_MS };
