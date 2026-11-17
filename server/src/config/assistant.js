// Cấu hình AI Assistant (giai đoạn 6b): chat hỏi đáp + phân tích fan, dùng chung một loại lượt
const ASSISTANT_LIMITS = {
  freePerDay: 20, // tin nhắn miễn phí mỗi ngày (làm mới lúc 0 giờ theo giờ người dùng); phân tích fan tính 1 tin
  packSize: 20, // mua thêm: 20 tin
  maxMessageChars: 1000, // tin nhắn của nghệ sĩ dài tối đa
  keepDays: 30, // cuộc trò chuyện lưu 30 ngày kể từ tin cuối
  historyTurns: 10, // gửi kèm 10 tin gần nhất làm ngữ cảnh
  contextComments: 100, // gửi tối đa 100 bình luận (đã ẩn danh) khi hỏi đáp
  busyMinutes: 10, // nhãn "Busy now" nếu model bị quá tải trong 10 phút gần nhất
  replyMaxChars: 3000,
  captionMaxChars: 500,
  titleMaxChars: 40,
};

// Giá mua thêm 20 tin (VNĐ) – trừ vào số dư ví, giống gói VIP
const MESSAGE_PACK_PRICE_VND = 75000;

// Lựa chọn model của một cuộc trò chuyện: 'auto' hoặc tên model cụ thể (model chính / model dự phòng)
const AUTO_MODEL = 'auto';

module.exports = { ASSISTANT_LIMITS, MESSAGE_PACK_PRICE_VND, AUTO_MODEL };
